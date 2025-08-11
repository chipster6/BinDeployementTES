
import { config } from '../config';
import { ValidationResult } from '../types';
import { validateDatabaseConsistency } from './database.validator';
import { validateAPIContractCompliance } from './api.validator';
import { validateSecurityRequirementAlignment } from './security.validator';
import { validateArchitecturalIntegrity } from './architecture.validator';
import { validateDocumentationSynchronization } from './documentation.validator';

const validationRules = {
  databaseConsistency: validateDatabaseConsistency,
  apiContractCompliance: validateAPIContractCompliance,
  securityRequirementAlignment: validateSecurityRequirementAlignment,
  architecturalIntegrity: validateArchitecturalIntegrity,
  documentationSynchronization: validateDocumentationSynchronization,
};

export async function runAllValidations(appConfig: typeof config): Promise<Record<string, ValidationResult>> {
  const results: Record<string, ValidationResult> = {};
  for (const [name, validator] of Object.entries(validationRules)) {
    results[name] = await validator(appConfig);
  }
  return results;
}
