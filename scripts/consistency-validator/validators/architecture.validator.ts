
import { config } from '../config';
import { ValidationResult, Inconsistency } from '../types';
import { logger } from '../logger';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export async function validateArchitecturalIntegrity(appConfig: typeof config): Promise<ValidationResult> {
  logger.info('Validating architectural integrity...');
  const inconsistencies: Inconsistency[] = [];

  try {
    // Load system design
    const systemDesignPath = path.join(appConfig.artifactsDir, 'system-design.yml');
    const systemDesignContent = await fs.readFile(systemDesignPath, 'utf8');
    const systemDesign = yaml.load(systemDesignContent) as any;

    const expectedModules = systemDesign.recovery_architecture?.phase_1_monolith?.primary_service?.modules || [];

    // Check for existence of module directories (simplified check)
    const srcDir = path.join(appConfig.backendDir, 'src');
    const implementedDirs = await fs.readdir(srcDir);

    const missingModules = expectedModules.filter((module: string) => {
      const moduleName = module.replace('_module', '').replace('_management', '');
      return !implementedDirs.some(dir => dir.toLowerCase().includes(moduleName));
    });

    if (missingModules.length > 0) {
      inconsistencies.push({
        severity: 'HIGH',
        type: 'MISSING_ARCHITECTURAL_MODULES',
        description: `The following modules defined in the system design are not implemented: ${missingModules.join(', ')}`,
        impact: 'Core functionality of the application is missing.',
        category: 'architecturalIntegrity',
        timestamp: new Date(),
      });
    }

    const status = inconsistencies.length === 0 ? 'CONSISTENT' : 'HIGH';
    return {
      status,
      summary: `Validated ${expectedModules.length} expected modules against the project structure.`,
      inconsistencies,
    };
  } catch (error) {
    logger.error('Error validating architectural integrity:', error);
    return {
      status: 'VALIDATION_ERROR',
      summary: 'Failed to validate architectural integrity',
      inconsistencies: [],
      error: error.message,
    };
  }
}
