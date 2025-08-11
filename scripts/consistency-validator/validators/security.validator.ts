
import { config } from '../config';
import { ValidationResult, Inconsistency } from '../types';
import { logger } from '../logger';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import * as ts from 'typescript';

function findMiddlewareUsage(sourceFile: ts.SourceFile): string[] {
  const usedMiddleware: string[] = [];
  
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isPropertyAccessExpression(expression) && expression.expression.getText().endsWith('this.app') && expression.name.getText() === 'use') {
        if (node.arguments.length > 0) {
          const middlewareName = node.arguments[0].getText();
          usedMiddleware.push(middlewareName);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return usedMiddleware;
}

export async function validateSecurityRequirementAlignment(appConfig: typeof config): Promise<ValidationResult> {
  logger.info('Validating security requirement alignment...');
  const inconsistencies: Inconsistency[] = [];

  try {
    // Load security requirements
    const securityReqPath = path.join(appConfig.artifactsDir, 'security-requirements.yml');
    const securityContent = await fs.readFile(securityReqPath, 'utf8');
    const securityReq = yaml.load(securityContent) as any;

    // Analyze middleware service
    const middlewareServicePath = path.join(appConfig.backendDir, 'src', 'services', 'middlewareService.ts');
    const middlewareServiceContent = await fs.readFile(middlewareServicePath, 'utf8');
    const sourceFile = ts.createSourceFile('middlewareService.ts', middlewareServiceContent, ts.ScriptTarget.ES2020, true);
    const usedMiddleware = findMiddlewareUsage(sourceFile);

    // Check for authentication middleware
    if (securityReq.authentication && !usedMiddleware.some(m => m.toLowerCase().includes('auth'))) {
      inconsistencies.push({
        severity: 'CRITICAL',
        type: 'MISSING_AUTHENTICATION_IMPLEMENTATION',
        description: 'Authentication is required but no authentication middleware is being used.',
        impact: 'The entire API is likely unsecured.',
        category: 'securityRequirementAlignment',
        timestamp: new Date(),
      });
    }

    // Check for RBAC (authorization) middleware
    if (securityReq.authorization && !usedMiddleware.some(m => m.toLowerCase().includes('rbac') || m.toLowerCase().includes('authorize'))) {
      inconsistencies.push({
        severity: 'CRITICAL',
        type: 'MISSING_AUTHORIZATION_IMPLEMENTATION',
        description: 'Authorization (RBAC) is required but no authorization middleware is being used.',
        impact: 'Role-based access control is not enforced.',
        category: 'securityRequirementAlignment',
        timestamp: new Date(),
      });
    }

    const status = inconsistencies.length === 0 ? 'CONSISTENT' : 'CRITICAL_ISSUE';
    return {
      status,
      summary: `Validated security middleware usage against requirements.`,
      inconsistencies,
    };
  } catch (error) {
    logger.error('Error validating security requirement alignment:', error);
    return {
      status: 'VALIDATION_ERROR',
      summary: 'Failed to validate security requirement alignment',
      inconsistencies: [],
      error: error.message,
    };
  }
}
