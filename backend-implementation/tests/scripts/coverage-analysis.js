/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - TEST COVERAGE ANALYSIS SCRIPT
 * ============================================================================
 *
 * Advanced test coverage analysis and reporting with detailed metrics,
 * threshold validation, and coverage trend analysis.
 *
 * Created by: Testing Infrastructure Agent
 * Date: 2025-08-12
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');

class CoverageAnalyzer {
  constructor() {
    this.coverageDir = path.join(__dirname, '../../coverage');
    this.coverageFile = path.join(this.coverageDir, 'coverage-final.json');
    this.lcovFile = path.join(this.coverageDir, 'lcov.info');
    this.reportDir = path.join(this.coverageDir, 'reports');
    this.thresholds = {
      global: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      services: {
        branches: 90,
        functions: 95,
        lines: 95,
        statements: 95,
      },
      models: {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      controllers: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85,
      },
    };
  }

  /**
   * Analyze coverage data and generate comprehensive report
   */
  async analyzeCoverage() {
    console.log('🔍 Analyzing test coverage...');

    try {
      if (!fs.existsSync(this.coverageFile)) {
        throw new Error(`Coverage file not found: ${this.coverageFile}`);
      }

      const coverageData = JSON.parse(fs.readFileSync(this.coverageFile, 'utf8'));
      
      const analysis = {
        summary: this.calculateSummary(coverageData),
        byDirectory: this.analyzeByDirectory(coverageData),
        uncoveredLines: this.findUncoveredLines(coverageData),
        thresholdViolations: this.checkThresholds(coverageData),
        trends: await this.analyzeTrends(),
        recommendations: [],
      };

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      // Ensure report directory exists
      if (!fs.existsSync(this.reportDir)) {
        fs.mkdirSync(this.reportDir, { recursive: true });
      }

      // Generate reports
      await this.generateHtmlReport(analysis);
      await this.generateJsonReport(analysis);
      await this.generateMarkdownReport(analysis);
      await this.generateConsoleReport(analysis);

      // Save current coverage for trend analysis
      await this.saveCoverageSnapshot(analysis.summary);

      console.log('✅ Coverage analysis completed');
      return analysis;
    } catch (error) {
      console.error('❌ Coverage analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Calculate overall coverage summary
   */
  calculateSummary(coverageData) {
    const totals = {
      lines: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
    };

    Object.values(coverageData).forEach(file => {
      ['lines', 'functions', 'statements', 'branches'].forEach(metric => {
        if (file[metric]) {
          totals[metric].total += file[metric].total || 0;
          totals[metric].covered += file[metric].covered || 0;
        }
      });
    });

    // Calculate percentages
    Object.keys(totals).forEach(metric => {
      if (totals[metric].total > 0) {
        totals[metric].pct = Math.round((totals[metric].covered / totals[metric].total) * 100);
      }
    });

    return totals;
  }

  /**
   * Analyze coverage by directory/component
   */
  analyzeByDirectory(coverageData) {
    const directories = {};

    Object.entries(coverageData).forEach(([filepath, data]) => {
      const relativePath = path.relative(process.cwd(), filepath);
      const parts = relativePath.split(path.sep);
      
      let dirPath = '';
      if (parts[0] === 'src') {
        dirPath = parts.slice(0, 2).join(path.sep); // src/controllers, src/services, etc.
      } else {
        dirPath = parts[0];
      }

      if (!directories[dirPath]) {
        directories[dirPath] = {
          files: 0,
          lines: { total: 0, covered: 0, pct: 0 },
          functions: { total: 0, covered: 0, pct: 0 },
          statements: { total: 0, covered: 0, pct: 0 },
          branches: { total: 0, covered: 0, pct: 0 },
        };
      }

      directories[dirPath].files++;

      ['lines', 'functions', 'statements', 'branches'].forEach(metric => {
        if (data[metric]) {
          directories[dirPath][metric].total += data[metric].total || 0;
          directories[dirPath][metric].covered += data[metric].covered || 0;
        }
      });
    });

    // Calculate percentages for each directory
    Object.keys(directories).forEach(dir => {
      ['lines', 'functions', 'statements', 'branches'].forEach(metric => {
        const data = directories[dir][metric];
        if (data.total > 0) {
          data.pct = Math.round((data.covered / data.total) * 100);
        }
      });
    });

    return directories;
  }

  /**
   * Find uncovered lines for focused testing
   */
  findUncoveredLines(coverageData) {
    const uncovered = [];

    Object.entries(coverageData).forEach(([filepath, data]) => {
      if (data.lines && data.lines.details) {
        const uncoveredLines = [];
        
        Object.entries(data.lines.details).forEach(([lineNum, hits]) => {
          if (hits === 0) {
            uncoveredLines.push(parseInt(lineNum));
          }
        });

        if (uncoveredLines.length > 0) {
          uncovered.push({
            file: path.relative(process.cwd(), filepath),
            lines: uncoveredLines,
            count: uncoveredLines.length,
            totalLines: Object.keys(data.lines.details).length,
            coveragePercent: data.lines.pct || 0,
          });
        }
      }
    });

    // Sort by most uncovered lines
    return uncovered.sort((a, b) => b.count - a.count);
  }

  /**
   * Check coverage thresholds
   */
  checkThresholds(coverageData) {
    const violations = [];
    const summary = this.calculateSummary(coverageData);
    const byDirectory = this.analyzeByDirectory(coverageData);

    // Check global thresholds
    Object.entries(this.thresholds.global).forEach(([metric, threshold]) => {
      if (summary[metric].pct < threshold) {
        violations.push({
          type: 'global',
          metric,
          actual: summary[metric].pct,
          threshold,
          severity: 'high',
        });
      }
    });

    // Check directory-specific thresholds
    Object.entries(byDirectory).forEach(([dir, data]) => {
      let thresholdSet = this.thresholds.global;
      
      if (dir.includes('services')) thresholdSet = this.thresholds.services;
      else if (dir.includes('models')) thresholdSet = this.thresholds.models;
      else if (dir.includes('controllers')) thresholdSet = this.thresholds.controllers;

      Object.entries(thresholdSet).forEach(([metric, threshold]) => {
        if (data[metric].pct < threshold) {
          violations.push({
            type: 'directory',
            directory: dir,
            metric,
            actual: data[metric].pct,
            threshold,
            severity: this.calculateViolationSeverity(data[metric].pct, threshold),
          });
        }
      });
    });

    return violations;
  }

  /**
   * Calculate violation severity based on threshold gap
   */
  calculateViolationSeverity(actual, threshold) {
    const gap = threshold - actual;
    if (gap > 20) return 'critical';
    if (gap > 10) return 'high';
    if (gap > 5) return 'medium';
    return 'low';
  }

  /**
   * Analyze coverage trends over time
   */
  async analyzeTrends() {
    const trendsFile = path.join(this.reportDir, 'coverage-trends.json');
    
    if (!fs.existsSync(trendsFile)) {
      return { history: [], trend: 'unknown' };
    }

    try {
      const trends = JSON.parse(fs.readFileSync(trendsFile, 'utf8'));
      
      if (trends.history.length < 2) {
        return { ...trends, trend: 'insufficient_data' };
      }

      // Calculate trend direction
      const recent = trends.history.slice(-3); // Last 3 entries
      const linesCoverage = recent.map(entry => entry.lines.pct);
      
      const isImproving = linesCoverage[linesCoverage.length - 1] > linesCoverage[0];
      const isStable = Math.abs(linesCoverage[linesCoverage.length - 1] - linesCoverage[0]) < 2;
      
      return {
        ...trends,
        trend: isStable ? 'stable' : (isImproving ? 'improving' : 'declining'),
        recentChange: linesCoverage[linesCoverage.length - 1] - linesCoverage[0],
      };
    } catch (error) {
      return { history: [], trend: 'error', error: error.message };
    }
  }

  /**
   * Save current coverage snapshot for trend analysis
   */
  async saveCoverageSnapshot(summary) {
    const trendsFile = path.join(this.reportDir, 'coverage-trends.json');
    
    let trends = { history: [] };
    if (fs.existsSync(trendsFile)) {
      try {
        trends = JSON.parse(fs.readFileSync(trendsFile, 'utf8'));
      } catch (error) {
        console.warn('Could not read existing trends file:', error.message);
      }
    }

    trends.history.push({
      date: new Date().toISOString(),
      ...summary,
    });

    // Keep only last 30 entries
    if (trends.history.length > 30) {
      trends.history = trends.history.slice(-30);
    }

    fs.writeFileSync(trendsFile, JSON.stringify(trends, null, 2));
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Critical threshold violations
    const criticalViolations = analysis.thresholdViolations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'coverage',
        title: 'Critical Coverage Gaps',
        description: `${criticalViolations.length} components have critically low coverage`,
        actions: criticalViolations.map(v => 
          `Increase ${v.metric} coverage in ${v.directory || 'global'} from ${v.actual}% to ${v.threshold}%`
        ),
      });
    }

    // Files with most uncovered lines
    const topUncovered = analysis.uncoveredLines.slice(0, 5);
    if (topUncovered.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'testing',
        title: 'Focus Testing Efforts',
        description: 'Files with the most uncovered lines need attention',
        actions: topUncovered.map(file => 
          `Add tests for ${file.file} (${file.count} uncovered lines, ${file.coveragePercent}% coverage)`
        ),
      });
    }

    // Trend-based recommendations
    if (analysis.trends.trend === 'declining') {
      recommendations.push({
        priority: 'high',
        category: 'quality',
        title: 'Coverage Declining',
        description: `Coverage has decreased by ${Math.abs(analysis.trends.recentChange)}% recently`,
        actions: [
          'Review recent changes and add missing tests',
          'Enforce stricter coverage requirements in CI/CD',
          'Schedule team discussion on testing practices',
        ],
      });
    }

    // Directory-specific recommendations
    const lowCoverageDirectories = Object.entries(analysis.byDirectory)
      .filter(([_, data]) => data.lines.pct < 70)
      .sort((a, b) => a[1].lines.pct - b[1].lines.pct)
      .slice(0, 3);

    if (lowCoverageDirectories.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'testing',
        title: 'Component-Specific Testing',
        description: 'Several components need focused testing attention',
        actions: lowCoverageDirectories.map(([dir, data]) => 
          `Improve ${dir} coverage from ${data.lines.pct}% to at least 85%`
        ),
      });
    }

    return recommendations;
  }

  /**
   * Generate HTML report
   */
  async generateHtmlReport(analysis) {
    const htmlContent = this.generateHtmlContent(analysis);
    const htmlFile = path.join(this.reportDir, 'coverage-analysis.html');
    fs.writeFileSync(htmlFile, htmlContent);
    console.log(`📊 HTML report generated: ${htmlFile}`);
  }

  /**
   * Generate HTML content
   */
  generateHtmlContent(analysis) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Coverage Analysis - Waste Management System</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #1e293b; }
        .metric-label { color: #64748b; text-transform: uppercase; font-size: 0.875em; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .violations { background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; }
        .violation { margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; }
        .severity-critical { border-left: 4px solid #dc2626; }
        .severity-high { border-left: 4px solid #ea580c; }
        .severity-medium { border-left: 4px solid #d97706; }
        .severity-low { border-left: 4px solid #65a30d; }
        .recommendations { background: #f0f9ff; border: 1px solid #bae6fd; padding: 20px; border-radius: 8px; }
        .recommendation { margin-bottom: 15px; padding: 15px; background: white; border-radius: 4px; }
        .priority-critical { border-left: 4px solid #dc2626; }
        .priority-high { border-left: 4px solid #ea580c; }
        .priority-medium { border-left: 4px solid #d97706; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; }
        .trend-improving { color: #16a34a; }
        .trend-declining { color: #dc2626; }
        .trend-stable { color: #6b7280; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Coverage Analysis Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Waste Management System - Comprehensive Coverage Analysis</p>
    </div>

    <div class="section">
        <h2>Overall Coverage Summary</h2>
        <div class="summary">
            <div class="metric-card">
                <div class="metric-value">${analysis.summary.lines.pct}%</div>
                <div class="metric-label">Lines</div>
                <div>${analysis.summary.lines.covered} / ${analysis.summary.lines.total}</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${analysis.summary.functions.pct}%</div>
                <div class="metric-label">Functions</div>
                <div>${analysis.summary.functions.covered} / ${analysis.summary.functions.total}</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${analysis.summary.statements.pct}%</div>
                <div class="metric-label">Statements</div>
                <div>${analysis.summary.statements.covered} / ${analysis.summary.statements.total}</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${analysis.summary.branches.pct}%</div>
                <div class="metric-label">Branches</div>
                <div>${analysis.summary.branches.covered} / ${analysis.summary.branches.total}</div>
            </div>
        </div>
    </div>

    ${analysis.thresholdViolations.length > 0 ? `
    <div class="section">
        <h2>Threshold Violations</h2>
        <div class="violations">
            ${analysis.thresholdViolations.map(violation => `
                <div class="violation severity-${violation.severity}">
                    <strong>${violation.type === 'global' ? 'Global' : violation.directory}</strong>: 
                    ${violation.metric} coverage is ${violation.actual}% (threshold: ${violation.threshold}%)
                    <span style="float: right; color: #dc2626;">${violation.severity.toUpperCase()}</span>
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <div class="section">
        <h2>Coverage by Component</h2>
        <table>
            <thead>
                <tr>
                    <th>Component</th>
                    <th>Files</th>
                    <th>Lines</th>
                    <th>Functions</th>
                    <th>Statements</th>
                    <th>Branches</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(analysis.byDirectory).map(([dir, data]) => `
                    <tr>
                        <td><strong>${dir}</strong></td>
                        <td>${data.files}</td>
                        <td>${data.lines.pct}%</td>
                        <td>${data.functions.pct}%</td>
                        <td>${data.statements.pct}%</td>
                        <td>${data.branches.pct}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${analysis.trends.trend !== 'unknown' ? `
    <div class="section">
        <h2>Coverage Trends</h2>
        <p>
            Trend: <span class="trend-${analysis.trends.trend}">${analysis.trends.trend.toUpperCase()}</span>
            ${analysis.trends.recentChange ? ` (${analysis.trends.recentChange > 0 ? '+' : ''}${analysis.trends.recentChange}% recent change)` : ''}
        </p>
    </div>
    ` : ''}

    <div class="section">
        <h2>Recommendations</h2>
        <div class="recommendations">
            ${analysis.recommendations.map(rec => `
                <div class="recommendation priority-${rec.priority}">
                    <h3>${rec.title}</h3>
                    <p>${rec.description}</p>
                    <ul>
                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate JSON report
   */
  async generateJsonReport(analysis) {
    const jsonFile = path.join(this.reportDir, 'coverage-analysis.json');
    fs.writeFileSync(jsonFile, JSON.stringify(analysis, null, 2));
    console.log(`📄 JSON report generated: ${jsonFile}`);
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport(analysis) {
    const markdown = this.generateMarkdownContent(analysis);
    const markdownFile = path.join(this.reportDir, 'coverage-analysis.md');
    fs.writeFileSync(markdownFile, markdown);
    console.log(`📝 Markdown report generated: ${markdownFile}`);
  }

  /**
   * Generate Markdown content
   */
  generateMarkdownContent(analysis) {
    return `
# Test Coverage Analysis Report

**Generated:** ${new Date().toLocaleString()}  
**Project:** Waste Management System

## Overall Coverage Summary

| Metric | Coverage | Covered/Total |
|--------|----------|---------------|
| Lines | ${analysis.summary.lines.pct}% | ${analysis.summary.lines.covered}/${analysis.summary.lines.total} |
| Functions | ${analysis.summary.functions.pct}% | ${analysis.summary.functions.covered}/${analysis.summary.functions.total} |
| Statements | ${analysis.summary.statements.pct}% | ${analysis.summary.statements.covered}/${analysis.summary.statements.total} |
| Branches | ${analysis.summary.branches.pct}% | ${analysis.summary.branches.covered}/${analysis.summary.branches.total} |

## Threshold Violations

${analysis.thresholdViolations.length === 0 ? '✅ No threshold violations found!' : 
analysis.thresholdViolations.map(v => 
`- **${v.severity.toUpperCase()}**: ${v.type === 'global' ? 'Global' : v.directory} ${v.metric} coverage is ${v.actual}% (threshold: ${v.threshold}%)`
).join('\n')}

## Coverage by Component

| Component | Files | Lines | Functions | Statements | Branches |
|-----------|-------|-------|-----------|------------|----------|
${Object.entries(analysis.byDirectory).map(([dir, data]) => 
`| ${dir} | ${data.files} | ${data.lines.pct}% | ${data.functions.pct}% | ${data.statements.pct}% | ${data.branches.pct}% |`
).join('\n')}

## Recommendations

${analysis.recommendations.map(rec => `
### ${rec.title} (${rec.priority.toUpperCase()} Priority)

${rec.description}

${rec.actions.map(action => `- ${action}`).join('\n')}
`).join('\n')}

## Uncovered Lines (Top 10)

${analysis.uncoveredLines.slice(0, 10).map(file => 
`- **${file.file}**: ${file.count} uncovered lines (${file.coveragePercent}% coverage)`
).join('\n')}
    `.trim();
  }

  /**
   * Generate console report
   */
  async generateConsoleReport(analysis) {
    console.log('\n📊 COVERAGE ANALYSIS RESULTS');
    console.log('================================');
    
    console.log('\n📈 OVERALL COVERAGE:');
    console.log(`  Lines:      ${analysis.summary.lines.pct}% (${analysis.summary.lines.covered}/${analysis.summary.lines.total})`);
    console.log(`  Functions:  ${analysis.summary.functions.pct}% (${analysis.summary.functions.covered}/${analysis.summary.functions.total})`);
    console.log(`  Statements: ${analysis.summary.statements.pct}% (${analysis.summary.statements.covered}/${analysis.summary.statements.total})`);
    console.log(`  Branches:   ${analysis.summary.branches.pct}% (${analysis.summary.branches.covered}/${analysis.summary.branches.total})`);

    if (analysis.thresholdViolations.length > 0) {
      console.log('\n⚠️  THRESHOLD VIOLATIONS:');
      analysis.thresholdViolations.forEach(violation => {
        const icon = violation.severity === 'critical' ? '🚨' : violation.severity === 'high' ? '⚠️' : '⚡';
        console.log(`  ${icon} ${violation.type === 'global' ? 'Global' : violation.directory}: ${violation.metric} ${violation.actual}% < ${violation.threshold}%`);
      });
    } else {
      console.log('\n✅ All coverage thresholds met!');
    }

    if (analysis.trends.trend !== 'unknown') {
      const trendIcon = analysis.trends.trend === 'improving' ? '📈' : 
                       analysis.trends.trend === 'declining' ? '📉' : '➡️';
      console.log(`\n${trendIcon} TREND: ${analysis.trends.trend.toUpperCase()}`);
      if (analysis.trends.recentChange) {
        console.log(`  Recent change: ${analysis.trends.recentChange > 0 ? '+' : ''}${analysis.trends.recentChange}%`);
      }
    }

    console.log('\n🎯 TOP RECOMMENDATIONS:');
    analysis.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.title} (${rec.priority})`);
      console.log(`     ${rec.description}`);
    });

    console.log('\n📁 REPORTS GENERATED:');
    console.log(`  - HTML: ${path.join(this.reportDir, 'coverage-analysis.html')}`);
    console.log(`  - JSON: ${path.join(this.reportDir, 'coverage-analysis.json')}`);
    console.log(`  - Markdown: ${path.join(this.reportDir, 'coverage-analysis.md')}`);
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new CoverageAnalyzer();
  analyzer.analyzeCoverage();
}

module.exports = CoverageAnalyzer;