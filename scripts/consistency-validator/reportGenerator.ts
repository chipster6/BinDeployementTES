import { ValidationResult, Inconsistency, ValidationReport } from './types';
import { logger } from './logger';
import { config } from './config';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export function generateValidationReport(
  validationResults: Record<string, ValidationResult>,
  inconsistencies: Inconsistency[]
): ValidationReport {
  const summary = {
    totalInconsistencies: inconsistencies.length,
    criticalIssues: inconsistencies.filter(i => i.severity === 'CRITICAL').length,
    highIssues: inconsistencies.filter(i => i.severity === 'HIGH').length,
    mediumIssues: inconsistencies.filter(i => i.severity === 'MEDIUM').length,
    categories: Object.keys(validationResults).length,
  };

  logger.info(`Total Inconsistencies: ${summary.totalInconsistencies}`);
  logger.info(`Critical Issues: ${summary.criticalIssues}`);

  const report: ValidationReport = {
    summary,
    validation_results: validationResults,
    inconsistencies,
    recommendations: generateRecommendations(inconsistencies),
  };

  saveValidationReport(report);
  updateErrorReportsIfNeeded(inconsistencies);

  return report;
}

async function saveValidationReport(report: ValidationReport) {
  const reportPath = path.join(config.artifactsDir, 'consistency-validation-report.yml');
  try {
    await fs.writeFile(reportPath, yaml.dump(report));
    logger.info(`Detailed report saved: ${reportPath}`);
  } catch (error) {
    logger.error('Failed to save validation report:', error);
  }
}

function generateRecommendations(inconsistencies: Inconsistency[]): any[] {
    const recommendations = [];
    const criticalIssues = inconsistencies.filter(i => i.severity === 'CRITICAL');
    if (criticalIssues.length > 0) {
        recommendations.push({
            priority: 'IMMEDIATE',
            action: 'Address critical inconsistencies',
            description: `${criticalIssues.length} critical inconsistencies blocking system functionality`,
        });
    }
    return recommendations;
}

async function updateErrorReportsIfNeeded(inconsistencies: Inconsistency[]) {
  const newCriticalIssues = inconsistencies.filter(i => i.severity === 'CRITICAL');
  if (newCriticalIssues.length > 0) {
    logger.info(`Updating error reports with ${newCriticalIssues.length} new critical issues...`);
    const errorReportsPath = path.join(config.artifactsDir, 'error-reports.md');
    try {
      const currentContent = await fs.readFile(errorReportsPath, 'utf8');
      const newIssuesSection = generateNewIssuesSection(newCriticalIssues);
      const updatedContent = currentContent + '\n\n' + newIssuesSection;
      await fs.writeFile(errorReportsPath, updatedContent);
      logger.info('Error reports updated with new critical issues');
    } catch (error) {
      logger.error('Failed to update error reports:', error);
    }
  }
}

function generateNewIssuesSection(criticalIssues: Inconsistency[]): string {
  const timestamp = new Date().toISOString();
  let section = `## NEW CRITICAL ISSUES DETECTED - ${timestamp}\n\n`;
  criticalIssues.forEach((issue, index) => {
    section += `### ${index + 1}. ${issue.type}\n`;
    section += `**Category**: ${issue.category}\n`;
    section += `**Description**: ${issue.description}\n`;
    section += `**Impact**: ${issue.impact}\n\n`;
  });
  return section;
}
