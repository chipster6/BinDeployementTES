import { config } from '../config';
import { ValidationResult, Inconsistency } from '../types';
import { logger } from '../logger';
import fs from 'fs/promises';
import path from 'path';

export async function validateDocumentationSynchronization(appConfig: typeof config): Promise<ValidationResult> {
  logger.info('Validating documentation synchronization...');
  const inconsistencies: Inconsistency[] = [];

  try {
    const artifactFiles = [
      'api-contracts.yml',
      'database-schema.sql',
      'security-requirements.yml',
      'system-design.yml',
    ];

    const fileStats = await Promise.all(
      artifactFiles.map(async file => {
        const filePath = path.join(appConfig.artifactsDir, file);
        try {
          const stat = await fs.stat(filePath);
          return { file, mtime: stat.mtime };
        } catch {
          return null;
        }
      })
    );

    const validFiles = fileStats.filter(stat => stat !== null) as { file: string; mtime: Date }[];

    if (validFiles.length > 1) {
      const oldest = validFiles.reduce((o, c) => c.mtime < o.mtime ? c : o);
      const newest = validFiles.reduce((o, c) => c.mtime > o.mtime ? c : o);
      const timeDiff = newest.mtime.getTime() - oldest.mtime.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      if (daysDiff > 1) {
        inconsistencies.push({
          severity: 'MEDIUM',
          type: 'DOCUMENTATION_DRIFT',
          description: `Documentation files have modification timestamps that are ${daysDiff.toFixed(1)} days apart.`,
          impact: 'Documentation may be out of sync with the implementation.',
          category: 'documentationSynchronization',
          timestamp: new Date(),
        });
      }
    }

    const status = inconsistencies.length === 0 ? 'CONSISTENT' : 'MINOR_ISSUES';
    return {
      status,
      summary: `Validated documentation synchronization.`,
      inconsistencies,
    };
  } catch (error) {
    logger.error('Error validating documentation synchronization:', error);
    return {
      status: 'VALIDATION_ERROR',
      summary: 'Failed to validate documentation synchronization',
      inconsistencies: [],
      error: error.message,
    };
  }
}