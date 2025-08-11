
import { config } from './config';
import { logger } from './logger';
import { runAllValidations } from './validators';
import { generateValidationReport } from './reportGenerator';
import { Inconsistency } from './types';

export class ConsistencyValidator {
  public readonly config = config;
  private inconsistencies: Inconsistency[] = [];

  public async runFullValidation() {
    logger.info('Running comprehensive consistency validation');
    
    this.inconsistencies = [];
    const validationResults = await runAllValidations(this.config);

    for (const result of Object.values(validationResults)) {
      if (result.inconsistencies && result.inconsistencies.length > 0) {
        this.inconsistencies.push(...result.inconsistencies);
      }
    }

    const report = generateValidationReport(validationResults, this.inconsistencies);
    logger.info('Validation report generated');

    const criticalIssues = this.inconsistencies.filter(i => i.severity === 'CRITICAL').length;
    return {
      totalInconsistencies: this.inconsistencies.length,
      criticalIssues,
      ...report,
    };
  }
}
