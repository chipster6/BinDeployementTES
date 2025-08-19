#!/usr/bin/env ts-node

/**
 * ============================================================================
 * BASE SERVICE COMPLIANCE VALIDATION SCRIPT
 * ============================================================================
 *
 * Executable script to validate BaseService pattern compliance across all
 * decomposed AI Error Prediction services. Generates comprehensive compliance
 * report and validates Hub Authority requirements.
 *
 * Usage:
 *   npm run validate:baseservice
 *   or
 *   ts-node scripts/validate-baseservice-compliance.ts
 *
 * Hub Authority Requirements:
 * - Complete service compliance validation
 * - Detailed reporting and recommendations
 * - Performance requirement validation
 * - Constructor dependency injection validation
 */

import path from "path";
import fs from "fs";
import { BaseServiceValidator } from "../src/utils/BaseServiceValidator";
import { logger } from "../src/utils/logger";

// Configure paths
const projectRoot = path.resolve(__dirname, "..");
const reportsDir = path.join(projectRoot, "validation-reports");

/**
 * Main validation execution
 */
async function main(): Promise<void> {
  try {
    console.log("\n" + "=".repeat(80));
    console.log("🔍 BASE SERVICE PATTERN COMPLIANCE VALIDATION");
    console.log("Hub Authority Requirements Assessment");
    console.log("=".repeat(80));

    // Initialize validator
    const validator = new BaseServiceValidator();

    // Execute validation
    console.log("\n📋 Starting validation process...");
    const startTime = Date.now();
    
    const summary = await validator.validateAllServices();
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ Validation completed in ${executionTime}ms`);

    // Generate detailed report
    console.log("\n📄 Generating compliance report...");
    const detailedReport = validator.generateDetailedReport(summary);

    // Display summary
    console.log("\n" + "=".repeat(80));
    console.log("VALIDATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`Overall Compliance: ${summary.overallCompliance ? "✅ COMPLIANT" : "❌ NON-COMPLIANT"}`);
    console.log(`Services Validated: ${summary.servicesValidated}`);
    console.log(`Services Compliant: ${summary.servicesCompliant}`);
    console.log(`Compliance Percentage: ${summary.compliancePercentage.toFixed(1)}%`);

    if (summary.criticalIssues.length > 0) {
      console.log(`\n⚠️  Critical Issues: ${summary.criticalIssues.length}`);
      summary.criticalIssues.slice(0, 3).forEach(issue => {
        console.log(`   • ${issue}`);
      });
      if (summary.criticalIssues.length > 3) {
        console.log(`   ... and ${summary.criticalIssues.length - 3} more`);
      }
    }

    // Save detailed report
    await saveValidationReport(detailedReport, summary);

    // Display service-by-service results
    console.log("\n" + "=".repeat(80));
    console.log("SERVICE COMPLIANCE STATUS");
    console.log("=".repeat(80));
    
    summary.serviceResults.forEach(result => {
      const status = result.hubRequirements.overall ? "✅ COMPLIANT" : "❌ NON-COMPLIANT";
      const issueCount = result.hubRequirements.issues.length;
      console.log(`${result.serviceName}: ${status}${issueCount > 0 ? ` (${issueCount} issues)` : ""}`);
    });

    // Performance requirements check
    console.log("\n" + "=".repeat(80));
    console.log("HUB AUTHORITY PERFORMANCE REQUIREMENTS");
    console.log("=".repeat(80));
    
    const predictionEngineResult = summary.serviceResults.find(r => r.serviceName === "ErrorPredictionEngineService");
    const modelManagementResult = summary.serviceResults.find(r => r.serviceName === "MLModelManagementService");
    
    if (predictionEngineResult) {
      console.log("🚀 ErrorPredictionEngineService:");
      console.log("   Target: <100ms prediction response time");
      console.log(`   Caching: ${predictionEngineResult.performanceValidation.hasCachingSupport ? "✅ Enabled" : "❌ Missing"}`);
      console.log(`   Error Handling: ${predictionEngineResult.performanceValidation.hasErrorHandling ? "✅ Enabled" : "❌ Missing"}`);
    }
    
    if (modelManagementResult) {
      console.log("\n🤖 MLModelManagementService:");
      console.log("   Target: <30s model deployment time");
      console.log(`   Caching: ${modelManagementResult.performanceValidation.hasCachingSupport ? "✅ Enabled" : "❌ Missing"}`);
      console.log(`   Error Handling: ${modelManagementResult.performanceValidation.hasErrorHandling ? "✅ Enabled" : "❌ Missing"}`);
    }

    // Recommendations
    if (summary.recommendations.length > 0) {
      console.log("\n" + "=".repeat(80));
      console.log("RECOMMENDATIONS FOR IMPROVEMENT");
      console.log("=".repeat(80));
      summary.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      if (summary.recommendations.length > 5) {
        console.log(`... and ${summary.recommendations.length - 5} more recommendations in full report`);
      }
    }

    // Final status
    console.log("\n" + "=".repeat(80));
    if (summary.overallCompliance) {
      console.log("🎉 VALIDATION SUCCESSFUL - ALL SERVICES HUB AUTHORITY COMPLIANT");
    } else {
      console.log("⚠️  VALIDATION INCOMPLETE - REVIEW ISSUES AND IMPLEMENT RECOMMENDATIONS");
    }
    console.log("=".repeat(80));

    // Exit with appropriate code
    process.exit(summary.overallCompliance ? 0 : 1);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("\n❌ Validation failed:", errorMessage);
    logger.error("BaseService validation script failed", { error: errorMessage, stack: errorStack });
    process.exit(1);
  }
}

/**
 * Save validation report to file
 */
async function saveValidationReport(detailedReport: string, summary: any): Promise<void> {
  try {
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportFilename = `baseservice-compliance-${timestamp}.txt`;
    const reportPath = path.join(reportsDir, reportFilename);

    // Add header with metadata
    const reportHeader = `BaseService Pattern Compliance Validation Report
Generated: ${new Date().toISOString()}
Validation Tool: BaseServiceValidator
Hub Authority Requirements: v1.0

Summary:
- Overall Compliance: ${summary.overallCompliance}
- Services Validated: ${summary.servicesValidated}
- Services Compliant: ${summary.servicesCompliant}
- Compliance Percentage: ${summary.compliancePercentage.toFixed(1)}%
- Critical Issues: ${summary.criticalIssues.length}
- Recommendations: ${summary.recommendations.length}

${detailedReport}

Generated by: BaseService Compliance Validation Script
Project: Waste Management System - AI Error Prediction Service Decomposition
`;

    // Write report to file
    fs.writeFileSync(reportPath, reportHeader);

    console.log(`\n📁 Detailed report saved to: ${reportPath}`);

    // Also save JSON summary for programmatic access
    const jsonReportPath = path.join(reportsDir, `baseservice-compliance-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(summary, null, 2));

    console.log(`📁 JSON summary saved to: ${jsonReportPath}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  Could not save validation report: ${errorMessage}`);
  }
}

/**
 * Display help information
 */
function displayHelp(): void {
  console.log(`
BaseService Compliance Validation Tool

Usage:
  npm run validate:baseservice     Run validation with default settings
  ts-node scripts/validate-baseservice-compliance.ts

Options:
  --help                          Show this help message

Description:
  Validates that all decomposed AI Error Prediction services comply with
  Hub Authority requirements for BaseService pattern implementation,
  constructor dependency injection, and interface compliance.

Services Validated:
  • ErrorPredictionEngineService   (<100ms prediction requirement)
  • MLModelManagementService       (<30s deployment requirement)
  • ErrorAnalyticsService          (real-time analytics)
  • ErrorCoordinationService       (cross-stream coordination)

Hub Authority Requirements:
  • BaseService extension
  • Constructor dependency injection
  • Interface implementation
  • Performance optimization
  • Error handling patterns
  • Caching strategy implementation

Reports Generated:
  • Detailed text report with recommendations
  • JSON summary for programmatic access
  • Compliance percentage and critical issues
`);
}

// Handle command line arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  displayHelp();
  process.exit(0);
}

// Execute main validation
if (require.main === module) {
  main().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Validation script failed:", errorMessage);
    process.exit(1);
  });
}

export { main as validateBaseServiceCompliance };