
import { config } from '../config';
import { ValidationResult, Inconsistency } from '../types';
import { logger } from '../logger';
import fs from 'fs/promises';
import path from 'path';
import * as ts from 'typescript';

function getModelFields(sourceFile: ts.SourceFile): string[] {
  const fields: string[] = [];
  let inDefine = false;

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText().endsWith('.define')) {
      inDefine = true;
    }

    if (inDefine && ts.isPropertyAssignment(node)) {
      fields.push(node.name.getText());
    }

    ts.forEachChild(node, visit);

    if (ts.isCallExpression(node) && node.expression.getText().endsWith('.define')) {
      inDefine = false;
    }
  }

  visit(sourceFile);
  return fields;
}

export async function validateDatabaseConsistency(appConfig: typeof config): Promise<ValidationResult> {
  logger.info('Validating database consistency...');
  const inconsistencies: Inconsistency[] = [];

  try {
    // Load database schema
    const schemaPath = path.join(appConfig.artifactsDir, 'database-schema.sql');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    const schemaTables = new Map<string, string[]>();
    const tableRegex = /CREATE TABLE core\.(\w+)\s*\(([\s\S]*?)\);/g;
    let match;
    while ((match = tableRegex.exec(schemaContent)) !== null) {
      const tableName = match[1];
      const columnsContent = match[2];
      const columnRegex = /^\s*(\w+)/gm;
      const columns = (columnsContent.match(columnRegex) || []).map(c => c.trim());
      schemaTables.set(tableName, columns);
    }

    // Get implemented models
    const modelsDir = path.join(appConfig.backendDir, 'src', 'models');
    const modelFiles = await fs.readdir(modelsDir);

    for (const file of modelFiles) {
      const modelPath = path.join(modelsDir, file);
      const modelContent = await fs.readFile(modelPath, 'utf8');
      const sourceFile = ts.createSourceFile(file, modelContent, ts.ScriptTarget.ES2020, true);
      
      const modelName = file.replace('.ts', '');
      const tableName = modelName; // Simplified assumption
      
      if (schemaTables.has(tableName)) {
        const modelFields = getModelFields(sourceFile);
        const schemaColumns = schemaTables.get(tableName) || [];

        const missingColumns = schemaColumns.filter(col => !modelFields.includes(col));
        if (missingColumns.length > 0) {
          inconsistencies.push({
            severity: 'HIGH',
            type: 'MISSING_MODEL_FIELDS',
            description: `Model '${modelName}' is missing fields for columns: ${missingColumns.join(', ')}`,
            impact: 'Data from these columns will not be accessible through the model.',
            category: 'databaseConsistency',
            timestamp: new Date(),
          });
        }
      }
    }

    const status = inconsistencies.length === 0 ? 'CONSISTENT' : 'HIGH';
    return {
      status,
      summary: `Validated ${modelFiles.length} models against ${schemaTables.size} tables.`,
      inconsistencies,
    };
  } catch (error) {
    logger.error('Error validating database consistency:', error);
    return {
      status: 'VALIDATION_ERROR',
      summary: 'Failed to validate database consistency',
      inconsistencies: [],
      error: error.message,
    };
  }
}
