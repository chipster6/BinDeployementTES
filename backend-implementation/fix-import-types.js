#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixImportTypes(dir) {
  const files = fs.readdirSync(dir);
  let totalFiles = 0;
  let fixedFiles = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      const result = fixImportTypes(filePath);
      totalFiles += result.totalFiles;
      fixedFiles += result.fixedFiles;
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      totalFiles++;
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Pattern 1: import { Type1, Type2 } from 'module' -> import type { Type1, Type2 } from 'module'
      // Only for common type-only imports
      const typeImportPatterns = [
        // Request, Response from express - these are type-only when used as type annotations
        /^import \{ (.*Request.*|.*Response.*|.*NextFunction.*) \} from ['"]express['"];?$/gm,
        
        // Sequelize types that are type-only
        /^import \{ (.*InferAttributes.*|.*InferCreationAttributes.*|.*CreationOptional.*|.*Association.*) \} from ['"]sequelize['"];?$/gm,
        
        // Other common type-only imports patterns
        /^import \{ ([^}]*)(Type|Interface|Enum)([^}]*) \} from ['"]([^'"]+)['"];?$/gm
      ];

      for (const pattern of typeImportPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, (match) => {
            if (!match.includes('import type')) {
              return match.replace('import {', 'import type {');
            }
            return match;
          });
          modified = true;
        }
      }

      // Pattern 2: Fix specific import patterns that should be type imports
      const specificTypeImports = [
        // User model when used as type annotation only
        { from: "import { User } from '@/models/User';", to: "import type { User } from '@/models/User';" },
        { from: 'import { User } from "@/models/User";', to: 'import type { User } from "@/models/User";' },
        
        // Common interface imports
        { from: "import { Request, Response } from 'express';", to: "import type { Request, Response } from 'express';" },
        { from: 'import { Request, Response } from "express";', to: 'import type { Request, Response } from "express";' }
      ];

      for (const { from, to } of specificTypeImports) {
        if (content.includes(from)) {
          content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixedFiles++;
        console.log(`Fixed imports: ${filePath}`);
      }
    }
  }

  return { totalFiles, fixedFiles };
}

// Start fixing from src directory
const srcDir = path.join(__dirname, 'src');
const result = fixImportTypes(srcDir);

console.log(`\n=== IMPORT TYPE FIXING COMPLETE ===`);
console.log(`Total TypeScript files processed: ${result.totalFiles}`);
console.log(`Files with import types fixed: ${result.fixedFiles}`);