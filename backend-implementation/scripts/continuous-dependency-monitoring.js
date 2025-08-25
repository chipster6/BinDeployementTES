#!/usr/bin/env node

/**
 * Continuous Dependency Monitoring Script
 * Monitors dependencies for security, performance, and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ContinuousDependencyMonitor {
    constructor() {
        this.packageJsonPath = path.join(process.cwd(), 'package.json');
        this.packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
        this.monitoringConfig = {
            thresholds: {
                maxBundleSize: '200M',
                maxDependencies: 40,
                maxDevDependencies: 60,
                maxSecurityVulnerabilities: 0,
                minDependencyHealthScore: 80
            },
            monitoring: {
                interval: '24h',
                alertChannel: 'security',
                reportFormat: 'json'
            }
        };
    }

    async monitor() {
        console.log('🔍 CONTINUOUS DEPENDENCY MONITORING');
        console.log('===================================\n');
        
        const report = {
            timestamp: new Date().toISOString(),
            health: {
                overall: 'healthy',
                score: 0,
                issues: []
            },
            metrics: await this.getCurrentMetrics(),
            security: await this.checkSecurity(),
            performance: await this.checkPerformance(),
            optimization: await this.checkOptimization(),
            recommendations: []
        };
        
        // Calculate overall health score
        report.health.score = this.calculateHealthScore(report);
        report.health.overall = this.getHealthStatus(report.health.score);
        
        // Generate recommendations
        report.recommendations = this.generateRecommendations(report);
        
        // Display report
        this.displayReport(report);
        
        // Save report
        this.saveReport(report);
        
        // Check for alerts
        this.checkAlerts(report);
        
        return report;
    }

    async getCurrentMetrics() {
        const metrics = {
            bundleSize: '0M',
            dependencies: Object.keys(this.packageJson.dependencies || {}).length,
            devDependencies: Object.keys(this.packageJson.devDependencies || {}).length,
            totalDependencies: 0,
            nodeModulesExists: fs.existsSync('node_modules')
        };
        
        try {
            if (metrics.nodeModulesExists) {
                const sizeOutput = execSync('du -sh node_modules 2>/dev/null || echo "0M"', { encoding: 'utf8' });
                metrics.bundleSize = sizeOutput.split('\t')[0].trim();
            }
        } catch (error) {
            console.warn('Could not measure bundle size:', error.message);
        }
        
        metrics.totalDependencies = metrics.dependencies + metrics.devDependencies;
        return metrics;
    }

    async checkSecurity() {
        console.log('🔒 Checking security vulnerabilities...');
        
        const security = {
            vulnerabilities: {},
            auditScore: 100,
            lastAuditDate: new Date().toISOString(),
            criticalIssues: 0,
            highIssues: 0,
            moderateIssues: 0,
            lowIssues: 0
        };
        
        try {
            const auditOutput = execSync('npm audit --json 2>/dev/null || echo "{}"', { encoding: 'utf8' });
            const auditData = JSON.parse(auditOutput);
            
            if (auditData.vulnerabilities) {
                security.vulnerabilities = auditData.vulnerabilities;
                
                // Count vulnerabilities by severity
                Object.values(auditData.vulnerabilities).forEach(vuln => {
                    switch (vuln.severity) {
                        case 'critical':
                            security.criticalIssues++;
                            break;
                        case 'high':
                            security.highIssues++;
                            break;
                        case 'moderate':
                            security.moderateIssues++;
                            break;
                        case 'low':
                            security.lowIssues++;
                            break;
                    }
                });
                
                // Calculate audit score
                const totalIssues = security.criticalIssues + security.highIssues + security.moderateIssues + security.lowIssues;
                if (totalIssues > 0) {
                    security.auditScore = Math.max(0, 100 - (security.criticalIssues * 50) - (security.highIssues * 20) - (security.moderateIssues * 10) - (security.lowIssues * 2));
                }
            }
            
            console.log(`   Security Score: ${security.auditScore}/100`);
            if (security.criticalIssues + security.highIssues > 0) {
                console.log(`   ⚠️  Found ${security.criticalIssues} critical and ${security.highIssues} high severity issues`);
            }
        } catch (error) {
            console.warn('   Could not perform security audit:', error.message);
            security.auditScore = 0;
        }
        
        return security;
    }

    async checkPerformance() {
        console.log('⚡ Checking performance metrics...');
        
        const performance = {
            bundleSizeOptimal: false,
            dependencyCountOptimal: false,
            unusedDependencies: [],
            largeDependencies: [],
            performanceScore: 0
        };
        
        // Check bundle size
        const metrics = await this.getCurrentMetrics();
        const bundleSizeNum = this.parseBundleSize(metrics.bundleSize);
        const maxBundleSizeNum = this.parseBundleSize(this.monitoringConfig.thresholds.maxBundleSize);
        
        performance.bundleSizeOptimal = bundleSizeNum <= maxBundleSizeNum;
        performance.dependencyCountOptimal = metrics.totalDependencies <= (this.monitoringConfig.thresholds.maxDependencies + this.monitoringConfig.thresholds.maxDevDependencies);
        
        // Check for known large dependencies
        const largeDependencies = ['cypress', 'webpack', '@babel/core', 'typescript'];
        for (const dep of largeDependencies) {
            if (this.packageJson.dependencies && this.packageJson.dependencies[dep]) {
                performance.largeDependencies.push(dep);
            }
        }
        
        // Calculate performance score
        let score = 100;
        if (!performance.bundleSizeOptimal) score -= 30;
        if (!performance.dependencyCountOptimal) score -= 20;
        score -= performance.largeDependencies.length * 10;
        
        performance.performanceScore = Math.max(0, score);
        
        console.log(`   Performance Score: ${performance.performanceScore}/100`);
        console.log(`   Bundle Size: ${metrics.bundleSize} (Target: <${this.monitoringConfig.thresholds.maxBundleSize})`);
        
        return performance;
    }

    async checkOptimization() {
        console.log('🔧 Checking optimization opportunities...');
        
        const optimization = {
            opportunities: [],
            potentialSavings: 0,
            optimizationScore: 100
        };
        
        // Check for outdated dependencies
        try {
            const outdatedOutput = execSync('npm outdated --json 2>/dev/null || echo "{}"', { encoding: 'utf8' });
            const outdatedData = JSON.parse(outdatedOutput);
            
            if (Object.keys(outdatedData).length > 0) {
                optimization.opportunities.push({
                    type: 'outdated-dependencies',
                    count: Object.keys(outdatedData).length,
                    impact: 'medium',
                    description: 'Update outdated dependencies for security and performance'
                });
                optimization.optimizationScore -= 15;
            }
        } catch (error) {
            console.warn('   Could not check for outdated dependencies');
        }
        
        // Check for duplicate dependencies
        try {
            const duplicatesOutput = execSync('npm ls --depth=0 2>&1 | grep -c "WARN.*requires" || echo "0"', { encoding: 'utf8' });
            const duplicateCount = parseInt(duplicatesOutput.trim());
            
            if (duplicateCount > 0) {
                optimization.opportunities.push({
                    type: 'duplicate-dependencies',
                    count: duplicateCount,
                    impact: 'low',
                    description: 'Remove duplicate dependencies to reduce bundle size'
                });
                optimization.optimizationScore -= 10;
            }
        } catch (error) {
            console.warn('   Could not check for duplicate dependencies');
        }
        
        // Check for development dependencies in production
        const devDepsInProd = ['typescript', '@types/', 'jest', 'eslint', 'prettier'];
        let devInProdCount = 0;
        
        for (const dep of Object.keys(this.packageJson.dependencies || {})) {
            if (devDepsInProd.some(devDep => dep.includes(devDep))) {
                devInProdCount++;
            }
        }
        
        if (devInProdCount > 0) {
            optimization.opportunities.push({
                type: 'dev-deps-in-production',
                count: devInProdCount,
                impact: 'high',
                description: 'Move development dependencies out of production'
            });
            optimization.optimizationScore -= 25;
        }
        
        console.log(`   Optimization Score: ${optimization.optimizationScore}/100`);
        console.log(`   Found ${optimization.opportunities.length} optimization opportunities`);
        
        return optimization;
    }

    calculateHealthScore(report) {
        const weights = {
            security: 0.4,
            performance: 0.3,
            optimization: 0.3
        };
        
        return Math.round(
            report.security.auditScore * weights.security +
            report.performance.performanceScore * weights.performance +
            report.optimization.optimizationScore * weights.optimization
        );
    }

    getHealthStatus(score) {
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'fair';
        if (score >= 60) return 'poor';
        return 'critical';
    }

    generateRecommendations(report) {
        const recommendations = [];
        
        // Security recommendations
        if (report.security.criticalIssues > 0) {
            recommendations.push({
                priority: 'critical',
                category: 'security',
                action: `Fix ${report.security.criticalIssues} critical security vulnerabilities immediately`,
                command: 'npm audit fix --force'
            });
        }
        
        if (report.security.highIssues > 0) {
            recommendations.push({
                priority: 'high',
                category: 'security',
                action: `Address ${report.security.highIssues} high severity security issues`,
                command: 'npm audit fix'
            });
        }
        
        // Performance recommendations
        if (!report.performance.bundleSizeOptimal) {
            recommendations.push({
                priority: 'medium',
                category: 'performance',
                action: 'Reduce bundle size by removing unused dependencies',
                command: 'node scripts/execute-dependency-optimizations.js'
            });
        }
        
        if (report.performance.largeDependencies.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'performance',
                action: `Optimize large dependencies: ${report.performance.largeDependencies.join(', ')}`,
                command: 'Review dependency usage and consider alternatives'
            });
        }
        
        // Optimization recommendations
        for (const opportunity of report.optimization.opportunities) {
            let priority = 'low';
            if (opportunity.impact === 'high') priority = 'high';
            else if (opportunity.impact === 'medium') priority = 'medium';
            
            recommendations.push({
                priority,
                category: 'optimization',
                action: opportunity.description,
                command: this.getOptimizationCommand(opportunity.type)
            });
        }
        
        return recommendations.sort((a, b) => {
            const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorities[b.priority] - priorities[a.priority];
        });
    }

    getOptimizationCommand(type) {
        const commands = {
            'outdated-dependencies': 'npm update',
            'duplicate-dependencies': 'npm dedupe',
            'dev-deps-in-production': 'Review and move dev dependencies'
        };
        return commands[type] || 'Manual review required';
    }

    displayReport(report) {
        console.log('\n📊 DEPENDENCY HEALTH REPORT');
        console.log('============================\n');
        
        // Overall health
        const healthIcon = this.getHealthIcon(report.health.overall);
        console.log(`${healthIcon} Overall Health: ${report.health.overall.toUpperCase()} (${report.health.score}/100)\n`);
        
        // Metrics
        console.log('📈 METRICS:');
        console.log(`   Bundle Size: ${report.metrics.bundleSize}`);
        console.log(`   Dependencies: ${report.metrics.dependencies}`);
        console.log(`   Dev Dependencies: ${report.metrics.devDependencies}`);
        console.log(`   Total Dependencies: ${report.metrics.totalDependencies}\n`);
        
        // Security
        console.log('🔒 SECURITY:');
        console.log(`   Audit Score: ${report.security.auditScore}/100`);
        if (report.security.criticalIssues + report.security.highIssues > 0) {
            console.log(`   Critical Issues: ${report.security.criticalIssues}`);
            console.log(`   High Issues: ${report.security.highIssues}`);
        }
        console.log();
        
        // Performance
        console.log('⚡ PERFORMANCE:');
        console.log(`   Performance Score: ${report.performance.performanceScore}/100`);
        console.log(`   Bundle Size Optimal: ${report.performance.bundleSizeOptimal ? '✅' : '❌'}`);
        console.log(`   Dependency Count Optimal: ${report.performance.dependencyCountOptimal ? '✅' : '❌'}\n`);
        
        // Recommendations
        if (report.recommendations.length > 0) {
            console.log('💡 TOP RECOMMENDATIONS:');
            report.recommendations.slice(0, 5).forEach((rec, index) => {
                const priorityIcon = this.getPriorityIcon(rec.priority);
                console.log(`   ${index + 1}. ${priorityIcon} [${rec.priority.toUpperCase()}] ${rec.action}`);
                if (rec.command) {
                    console.log(`      $ ${rec.command}`);
                }
            });
            console.log();
        }
        
        // Thresholds status
        console.log('🎯 THRESHOLD STATUS:');
        console.log(`   Max Bundle Size: ${report.metrics.bundleSize} / ${this.monitoringConfig.thresholds.maxBundleSize}`);
        console.log(`   Max Dependencies: ${report.metrics.totalDependencies} / ${this.monitoringConfig.thresholds.maxDependencies + this.monitoringConfig.thresholds.maxDevDependencies}`);
        console.log(`   Min Health Score: ${report.health.score} / ${this.monitoringConfig.thresholds.minDependencyHealthScore}`);
    }

    getHealthIcon(health) {
        const icons = {
            excellent: '🟢',
            good: '🟡',
            fair: '🟠',
            poor: '🔴',
            critical: '🚨'
        };
        return icons[health] || '⚪';
    }

    getPriorityIcon(priority) {
        const icons = {
            critical: '🚨',
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        return icons[priority] || '⚪';
    }

    parseBundleSize(sizeStr) {
        const match = sizeStr.match(/^(\d+(?:\.\d+)?)(M|G|K)?$/);
        if (!match) return 0;
        
        const value = parseFloat(match[1]);
        const unit = match[2] || '';
        
        switch (unit) {
            case 'G': return value * 1024;
            case 'M': return value;
            case 'K': return value / 1024;
            default: return value / (1024 * 1024); // Assume bytes
        }
    }

    saveReport(report) {
        const reportPath = path.join(process.cwd(), 'dependency-monitoring-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Also append to history
        const historyPath = path.join(process.cwd(), 'dependency-monitoring-history.json');
        let history = [];
        
        if (fs.existsSync(historyPath)) {
            try {
                history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            } catch (error) {
                console.warn('Could not read monitoring history');
            }
        }
        
        history.push({
            timestamp: report.timestamp,
            health: report.health,
            metrics: report.metrics
        });
        
        // Keep only last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        history = history.filter(entry => new Date(entry.timestamp) > thirtyDaysAgo);
        
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
        
        console.log(`\n📄 Report saved to: ${reportPath}`);
        console.log(`📊 History updated: ${historyPath}`);
    }

    checkAlerts(report) {
        const alerts = [];
        
        if (report.health.score < this.monitoringConfig.thresholds.minDependencyHealthScore) {
            alerts.push({
                level: 'warning',
                message: `Dependency health score (${report.health.score}) below threshold (${this.monitoringConfig.thresholds.minDependencyHealthScore})`
            });
        }
        
        if (report.security.criticalIssues > 0) {
            alerts.push({
                level: 'critical',
                message: `${report.security.criticalIssues} critical security vulnerabilities detected`
            });
        }
        
        if (alerts.length > 0) {
            console.log('\n🚨 ALERTS:');
            alerts.forEach(alert => {
                console.log(`   ${alert.level.toUpperCase()}: ${alert.message}`);
            });
        }
    }
}

// Execute monitoring if run directly
if (require.main === module) {
    const monitor = new ContinuousDependencyMonitor();
    monitor.monitor().catch(console.error);
}

module.exports = ContinuousDependencyMonitor;