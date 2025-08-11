
import { config } from '../config';
import { ValidationResult, Inconsistency } from '../types';
import { logger } from '../logger';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import * as ts from 'typescript';

function getImplementedEndpoints(sourceFile: ts.SourceFile): { path: string; method: string }[] {
  const endpoints: { path: string; method: string }[] = [];
  
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isPropertyAccessExpression(expression) && expression.expression.getText().endsWith('Router')) {
        const method = expression.name.getText();
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const routePath = ts.isStringLiteral(node.arguments[0]) ? node.arguments[0].text : 'unknown';
          endpoints.push({ path: routePath, method: method.toUpperCase() });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return endpoints;
}

export async function validateAPIContractCompliance(appConfig: typeof config): Promise<ValidationResult> {
  logger.info('Validating API contract compliance...');
  const inconsistencies: Inconsistency[] = [];

  try {
    // Load API contracts
    const contractsPath = path.join(appConfig.artifactsDir, 'api-contracts.yml');
    const contractsContent = await fs.readFile(contractsPath, 'utf8');
    const contracts = yaml.load(contractsContent) as any;

    const definedEndpoints: { path: string; method: string }[] = [];
    for (const path in contracts.paths) {
      for (const method in contracts.paths[path]) {
        definedEndpoints.push({ path, method: method.toUpperCase() });
      }
    }

    // Get implemented routes
    const routesDir = path.join(appConfig.backendDir, 'src', 'routes');
    const routeFiles = await fs.readdir(routesDir);
    const implementedEndpoints: { path: string; method: string; file: string }[] = [];

    for (const file of routeFiles) {
      const routePath = path.join(routesDir, file);
      const routeContent = await fs.readFile(routePath, 'utf8');
      const sourceFile = ts.createSourceFile(file, routeContent, ts.ScriptTarget.ES2020, true);
      const endpoints = getImplementedEndpoints(sourceFile);
      implementedEndpoints.push(...endpoints.map(e => ({ ...e, file })));
    }

    // Find missing implementations
    const missingImplementations = definedEndpoints.filter(
      d => !implementedEndpoints.some(i => i.path === d.path && i.method === d.method)
    );

    if (missingImplementations.length > 0) {
      inconsistencies.push({
        severity: 'CRITICAL',
        type: 'MISSING_IMPLEMENTATIONS',
        description: `API endpoints defined in contracts but not implemented: ${missingImplementations.map(e => `${e.method} ${e.path}`).join(', ')}`,
        impact: 'Clients will receive 404 errors for these endpoints.',
        category: 'apiContractCompliance',
        timestamp: new Date(),
      });
    }

    const status = inconsistencies.length === 0 ? 'CONSISTENT' : 'CRITICAL_ISSUE';
    return {
      status,
      summary: `Found ${definedEndpoints.length} defined endpoints and ${implementedEndpoints.length} implemented endpoints.`,
      inconsistencies,
    };
  } catch (error) {
    logger.error('Error validating API contract compliance:', error);
    return {
      status: 'VALIDATION_ERROR',
      summary: 'Failed to validate API contract compliance',
      inconsistencies: [],
      error: error.message,
    };
  }
}
