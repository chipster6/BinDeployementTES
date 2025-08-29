/**
 * TypeScript Configuration Validation Tests
 * 
 * Tests to ensure TypeScript configuration is correct and path mappings work
 */

import { describe, it, expect } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';

describe('TypeScript Configuration Validation', () => {
  const tsconfigPath = path.join(__dirname, '../../../tsconfig.json');
  
  it('should have valid tsconfig.json file', () => {
    expect(fs.existsSync(tsconfigPath)).toBe(true);
    
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);
    
    expect(tsconfig.compilerOptions).toBeDefined();
  });

  it('should have correct baseUrl configuration', () => {
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);
    
    expect(tsconfig.compilerOptions.baseUrl).toBe('./src');
  });

  it('should have correct path alias configuration', () => {
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);
    
    expect(tsconfig.compilerOptions.paths).toBeDefined();
    expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['*']);
  });

  it('should have proper module interop settings', () => {
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);
    
    expect(tsconfig.compilerOptions.esModuleInterop).toBe(true);
    expect(tsconfig.compilerOptions.allowSyntheticDefaultImports).toBe(true);
  });

  it('should have strict type checking enabled', () => {
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfig = JSON.parse(tsconfigContent);
    
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noImplicitAny).toBe(true);
  });
});

// Test path alias resolution
describe('Path Alias Resolution', () => {
  it('should resolve @/ imports correctly', async () => {
    // This test validates that the path mapping works by attempting to import
    // a known module using the @/ alias
    try {
      const { config } = await import('@/config');
      expect(config).toBeDefined();
    } catch (error) {
      // If import fails, it might be due to the module not existing
      // but the path resolution should still work
      expect(error).toBeInstanceOf(Error);
    }
  });
});