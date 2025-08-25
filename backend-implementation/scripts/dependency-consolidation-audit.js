#!/usr/bin/env node

/**
 * ============================================================================
 * DEPENDENCY CONSOLIDATION & AUDIT AUTOMATION
 * ============================================================================
 * 
 * Automated dependency management system for production readiness.
 * Provides comprehensive analysis and resolution of dependency conflicts.
 * 
 * Features:
 * - Express version conflict detection
 * - Validation framework duplication analysis
 * - Bundle size optimization recommendations
 * - Security vulnerability scanning
 * - Automated fix suggestions
 * - CI/CD integration support
 * 
 * Created by: Dependency Resolution Engineer
 * Date: 2025-08-24
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class DependencyConsolidationAuditor {
  constructor() {
    this.rootPath = process.cwd();
    this.issues = [];
    this.fixes = [];
    this.metrics = {
      bundleSize: null,
      duplicates: 0,
      vulnerabilities: 0,
      conflicts: 0
    };
  }

  /**
   * Run complete dependency audit
   */
  async runAudit() {
    console.log(chalk.blue.bold('🔍 DEPENDENCY CONSOLIDATION AUDIT'));
    console.log(chalk.gray('=' .repeat(60)));
    
    try {
      await this.analyzeBundleSize();
      await this.detectVersionConflicts();
      await this.analyzeValidationFrameworks();
      await this.scanSecurityVulnerabilities();
      await this.generateRecommendations();
      
      this.printReport();
      this.saveReport();
      
    } catch (error) {
      console.error(chalk.red('❌ Audit failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Analyze current bundle size
   */
  async analyzeBundleSize() {
    console.log(chalk.yellow('📦 Analyzing bundle size...'));
    
    try {
      if (fs.existsSync('node_modules')) {
        const output = execSync('du -sh node_modules', { encoding: 'utf8' });
        const sizeStr = output.trim().split('\t')[0];
        this.metrics.bundleSize = sizeStr;
        
        // Parse size for comparison (convert to MB)
        const sizeNum = parseFloat(sizeStr);
        const sizeMB = sizeStr.includes('G') ? sizeNum * 1024 : sizeNum;
        
        if (sizeMB > 300) {
          this.issues.push({
            type: 'BUNDLE_SIZE',
            severity: 'HIGH',
            message: `Bundle size ${sizeStr} exceeds 300MB threshold`,
            recommendation: 'Remove unused dependencies and optimize package selection'
          });
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not analyze bundle size'));
    }
  }

  /**
   * Detect version conflicts across packages
   */
  async detectVersionConflicts() {
    console.log(chalk.yellow('⚡ Detecting version conflicts...'));
    
    try {
      // Check Express versions
      const expressTree = execSync('npm ls express', { encoding: 'utf8' });
      const expressVersions = this.extractVersions(expressTree, 'express');
      
      if (expressVersions.length > 1) {
        this.issues.push({
          type: 'VERSION_CONFLICT',
          severity: 'CRITICAL',
          message: `Express version conflict detected: ${expressVersions.join(', ')}`,
          recommendation: 'Standardize Express version across all workspace packages'
        });
        this.metrics.conflicts++;
      } else {
        console.log(chalk.green('✅ Express versions aligned'));
      }

      // Check for other common conflicts
      const commonPackages = ['typescript', 'joi', 'jsonwebtoken', 'cors'];
      for (const pkg of commonPackages) {
        try {
          const tree = execSync(`npm ls ${pkg}`, { encoding: 'utf8' });
          const versions = this.extractVersions(tree, pkg);
          if (versions.length > 1) {
            this.issues.push({
              type: 'VERSION_CONFLICT',
              severity: 'MEDIUM',
              message: `${pkg} version conflict: ${versions.join(', ')}`,
              recommendation: `Standardize ${pkg} version across packages`
            });
            this.metrics.conflicts++;
          }
        } catch (e) {
          // Package not found, skip
        }
      }

    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not detect version conflicts'));
    }
  }

  /**
   * Analyze validation framework duplication
   */
  async analyzeValidationFrameworks() {
    console.log(chalk.yellow('🔧 Analyzing validation frameworks...'));
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const validationFrameworks = [];
    if (allDeps['express-validator']) validationFrameworks.push('express-validator');
    if (allDeps['joi']) validationFrameworks.push('joi');
    if (allDeps['yup']) validationFrameworks.push('yup');
    if (allDeps['zod']) validationFrameworks.push('zod');
    
    if (validationFrameworks.length > 1) {
      this.issues.push({
        type: 'VALIDATION_DUPLICATION',
        severity: 'HIGH',
        message: `Multiple validation frameworks detected: ${validationFrameworks.join(', ')}`,
        recommendation: 'Consolidate to single validation framework (recommend Joi for consistency)'
      });
      this.metrics.duplicates++;
    } else if (validationFrameworks.length === 1) {
      console.log(chalk.green(`✅ Single validation framework: ${validationFrameworks[0]}`));
    }
  }

  /**
   * Scan for security vulnerabilities
   */
  async scanSecurityVulnerabilities() {
    console.log(chalk.yellow('🛡️  Scanning security vulnerabilities...'));
    
    try {
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditOutput);
      
      this.metrics.vulnerabilities = audit.metadata?.vulnerabilities?.total || 0;
      
      if (this.metrics.vulnerabilities > 0) {
        const severity = audit.metadata.vulnerabilities.high > 0 || audit.metadata.vulnerabilities.critical > 0 
          ? 'CRITICAL' : 'MEDIUM';
        
        this.issues.push({
          type: 'SECURITY_VULNERABILITY',
          severity,
          message: `${this.metrics.vulnerabilities} security vulnerabilities found`,
          recommendation: 'Run `npm audit fix` to resolve vulnerabilities'
        });
      } else {
        console.log(chalk.green('✅ No security vulnerabilities found'));
      }
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities found
      const output = error.stdout || '';
      if (output && output.includes('"vulnerabilities"')) {
        try {
          const audit = JSON.parse(output);
          this.metrics.vulnerabilities = audit.metadata?.vulnerabilities?.total || 0;
        } catch (parseError) {
          console.warn(chalk.yellow('⚠️  Could not parse audit results'));
        }
      }
    }
  }

  /**
   * Generate optimization recommendations
   */
  async generateRecommendations() {
    console.log(chalk.yellow('💡 Generating recommendations...'));
    
    // Bundle size optimization
    if (this.metrics.bundleSize && this.metrics.bundleSize.includes('M')) {
      const sizeMB = parseFloat(this.metrics.bundleSize);
      if (sizeMB > 300) {
        this.fixes.push({
          type: 'OPTIMIZATION',
          action: 'Remove unused devDependencies from production builds',
          impact: 'Reduce bundle size by ~30-50%'
        });
      }
    }

    // Automated fixes
    if (this.metrics.vulnerabilities > 0) {
      this.fixes.push({
        type: 'SECURITY',
        action: 'npm audit fix --force',
        impact: `Resolve ${this.metrics.vulnerabilities} security vulnerabilities`
      });
    }

    if (this.metrics.conflicts > 0) {
      this.fixes.push({
        type: 'VERSION_ALIGNMENT',
        action: 'Update workspace packages to use consistent versions',
        impact: 'Eliminate version conflicts and reduce duplicate dependencies'
      });
    }
  }

  /**
   * Extract versions from npm ls output
   */
  extractVersions(treeOutput, packageName) {
    const lines = treeOutput.split('\n');
    const versions = new Set();
    
    for (const line of lines) {
      if (line.includes(`${packageName}@`)) {
        const match = line.match(new RegExp(`${packageName}@([\\d\\.]+)`));
        if (match) {
          versions.add(match[1]);
        }
      }
    }
    
    return Array.from(versions);
  }

  /**
   * Print audit report
   */
  printReport() {
    console.log('\n' + chalk.blue.bold('📊 AUDIT REPORT'));
    console.log(chalk.gray('=' .repeat(60)));
    
    // Metrics
    console.log(chalk.cyan('📈 Metrics:'));
    console.log(`  Bundle Size: ${this.metrics.bundleSize || 'Unknown'}`);
    console.log(`  Version Conflicts: ${this.metrics.conflicts}`);
    console.log(`  Duplicate Frameworks: ${this.metrics.duplicates}`);
    console.log(`  Security Vulnerabilities: ${this.metrics.vulnerabilities}`);
    
    // Issues
    if (this.issues.length > 0) {
      console.log('\n' + chalk.red.bold('🚨 ISSUES FOUND:'));
      this.issues.forEach((issue, index) => {
        const severityColor = issue.severity === 'CRITICAL' ? 'red' : 
                             issue.severity === 'HIGH' ? 'yellow' : 'cyan';
        
        console.log(`\n${index + 1}. ${chalk[severityColor].bold(issue.severity)} - ${issue.type}`);
        console.log(`   ${issue.message}`);
        console.log(`   💡 ${chalk.green(issue.recommendation)}`);
      });
    } else {
      console.log('\n' + chalk.green.bold('✅ No critical issues found'));
    }
    
    // Fixes
    if (this.fixes.length > 0) {
      console.log('\n' + chalk.blue.bold('🔧 RECOMMENDED ACTIONS:'));
      this.fixes.forEach((fix, index) => {
        console.log(`\n${index + 1}. ${chalk.cyan.bold(fix.type)}`);
        console.log(`   Action: ${chalk.white(fix.action)}`);
        console.log(`   Impact: ${chalk.green(fix.impact)}`);
      });
    }

    // Summary
    const score = this.calculateHealthScore();
    const scoreColor = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
    console.log('\n' + chalk[scoreColor].bold(`🎯 DEPENDENCY HEALTH SCORE: ${score}%`));
  }

  /**
   * Calculate dependency health score
   */
  calculateHealthScore() {
    let score = 100;
    
    // Deduct for issues
    score -= this.metrics.conflicts * 15;      // Version conflicts
    score -= this.metrics.duplicates * 10;    // Duplicate frameworks  
    score -= Math.min(this.metrics.vulnerabilities * 5, 30); // Vulnerabilities (cap at 30)
    
    // Bundle size penalty
    if (this.metrics.bundleSize && this.metrics.bundleSize.includes('M')) {
      const sizeMB = parseFloat(this.metrics.bundleSize);
      if (sizeMB > 500) score -= 15;
      else if (sizeMB > 400) score -= 10;
      else if (sizeMB > 300) score -= 5;
    }
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Save report to file
   */
  saveReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      issues: this.issues,
      fixes: this.fixes,
      healthScore: this.calculateHealthScore()
    };

    const reportsDir = 'reports/dependency-management';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFile = path.join(reportsDir, `dependency-audit-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    
    console.log(`\n💾 Report saved to: ${chalk.cyan(reportFile)}`);
  }
}

// CLI execution
if (require.main === module) {
  const auditor = new DependencyConsolidationAuditor();
  auditor.runAudit().catch(error => {
    console.error(chalk.red('❌ Audit failed:'), error);
    process.exit(1);
  });
}

module.exports = DependencyConsolidationAuditor;