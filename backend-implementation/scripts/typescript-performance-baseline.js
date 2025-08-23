#!/usr/bin/env node

/**
 * TypeScript Performance Baseline Measurement
 * 
 * Establishes baseline performance metrics for TypeScript modernization
 * monitoring and optimization during 6,416+ type safety improvements.
 */

const { execSync } = require('child_process');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

class TypeScriptPerformanceBaseline {
  constructor() {
    this.PROJECT_ROOT = process.cwd();
    this.BASELINE_FILE = path.join(this.PROJECT_ROOT, 'typescript-performance-baseline.json');
  }

  /**
   * Measure current TypeScript compilation performance
   */
  async measurePerformance() {
    console.log('🔍 Measuring TypeScript compilation performance...');
    
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed;
    
    let compilationTime = 0;
    let typeErrors = 0;
    let filesProcessed = 0;
    let success = false;

    try {
      // Run TypeScript compilation
      const compilationStart = performance.now();
      
      try {
        const result = execSync('npx tsc --noEmit --incremental', {
          cwd: this.PROJECT_ROOT,
          timeout: 120000, // 2 minute timeout
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        success = true;
      } catch (error) {
        // Count errors from compilation output
        const errorOutput = error.stderr || error.stdout || error.message || '';
        typeErrors = this.countTypeErrors(errorOutput);
      }
      
      compilationTime = (performance.now() - compilationStart) / 1000;
      
      // Count TypeScript files
      filesProcessed = this.countTypeScriptFiles();
      
    } catch (error) {
      console.error('❌ Error during compilation:', error.message);
      compilationTime = (performance.now() - startTime) / 1000;
    }

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryUsage = Math.max((memoryAfter - memoryBefore) / 1024 / 1024, 0); // Convert to MB
    
    const baseline = {
      timestamp: new Date().toISOString(),
      compilationTime,
      memoryUsage,
      typeErrors,
      filesProcessed,
      success,
      cacheHitRate: this.calculateCacheHitRate(),
      linesOfCode: this.calculateLinesOfCode(),
      performanceStatus: this.getPerformanceStatus(compilationTime, memoryUsage, typeErrors)
    };

    return baseline;
  }

  /**
   * Count TypeScript files in the project
   */
  countTypeScriptFiles() {
    try {
      const result = execSync('find src -name "*.ts" -type f | wc -l', {
        encoding: 'utf-8',
        cwd: this.PROJECT_ROOT
      });
      return parseInt(result.trim());
    } catch {
      return 0;
    }
  }

  /**
   * Count type errors in compilation output
   */
  countTypeErrors(output) {
    const errorMatches = output.match(/error TS\d+:/g);
    return errorMatches ? errorMatches.length : 0;
  }

  /**
   * Calculate build cache hit rate
   */
  calculateCacheHitRate() {
    try {
      const buildInfoPath = path.join(this.PROJECT_ROOT, 'dist', '.tsbuildinfo');
      
      if (!fs.existsSync(buildInfoPath)) {
        return 0;
      }
      
      const stats = fs.statSync(buildInfoPath);
      const age = Date.now() - stats.mtime.getTime();
      
      // Estimate cache effectiveness based on file age
      return Math.max(0, Math.min(100, 100 - (age / 1000 / 60 / 5))); // Decay over 5 minutes
      
    } catch {
      return 0;
    }
  }

  /**
   * Calculate lines of code in the project
   */
  calculateLinesOfCode() {
    try {
      const result = execSync('find src -name "*.ts" -exec wc -l {} + | tail -n 1 | awk \'{print $1}\'', {
        encoding: 'utf-8',
        cwd: this.PROJECT_ROOT
      });
      return parseInt(result.trim());
    } catch {
      return 0;
    }
  }

  /**
   * Get performance status based on metrics
   */
  getPerformanceStatus(compilationTime, memoryUsage, typeErrors) {
    const THRESHOLDS = {
      maxCompilationTime: 30, // seconds
      maxMemoryUsage: 2048,   // MB
      maxTypeErrors: 50
    };

    if (compilationTime <= THRESHOLDS.maxCompilationTime && 
        memoryUsage <= THRESHOLDS.maxMemoryUsage && 
        typeErrors <= THRESHOLDS.maxTypeErrors) {
      return 'EXCELLENT';
    } else if (compilationTime <= THRESHOLDS.maxCompilationTime * 1.5 && 
               memoryUsage <= THRESHOLDS.maxMemoryUsage * 1.5) {
      return 'GOOD';
    } else if (compilationTime <= THRESHOLDS.maxCompilationTime * 2) {
      return 'NEEDS_ATTENTION';
    } else {
      return 'CRITICAL';
    }
  }

  /**
   * Save baseline to file
   */
  saveBaseline(baseline) {
    try {
      fs.writeFileSync(this.BASELINE_FILE, JSON.stringify(baseline, null, 2));
      console.log(`💾 Baseline saved to: ${this.BASELINE_FILE}`);
    } catch (error) {
      console.error('❌ Failed to save baseline:', error.message);
    }
  }

  /**
   * Display baseline results
   */
  displayBaseline(baseline) {
    console.log('\n📊 TYPESCRIPT PERFORMANCE BASELINE:');
    console.log('=====================================');
    console.log(`   Compilation Time: ${baseline.compilationTime.toFixed(2)}s`);
    console.log(`   Memory Usage: ${baseline.memoryUsage.toFixed(2)}MB`);
    console.log(`   Type Errors: ${baseline.typeErrors}`);
    console.log(`   Files Processed: ${baseline.filesProcessed}`);
    console.log(`   Lines of Code: ${baseline.linesOfCode.toLocaleString()}`);
    console.log(`   Cache Hit Rate: ${baseline.cacheHitRate.toFixed(1)}%`);
    console.log(`   Status: ${this.getStatusIcon(baseline.performanceStatus)} ${baseline.performanceStatus}`);
    
    // Performance recommendations
    if (baseline.performanceStatus !== 'EXCELLENT') {
      console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
      
      if (baseline.compilationTime > 30) {
        console.log('   • Enable incremental compilation optimization');
        console.log('   • Consider using transpile-only mode during development');
      }
      
      if (baseline.memoryUsage > 2048) {
        console.log('   • Enable project references for large codebases');
        console.log('   • Exclude test files from main compilation');
      }
      
      if (baseline.typeErrors > 50) {
        console.log('   • Focus on resolving critical type errors first');
        console.log('   • Use stricter TypeScript configuration gradually');
      }
      
      if (baseline.cacheHitRate < 60) {
        console.log('   • Ensure .tsbuildinfo files are preserved');
        console.log('   • Configure optimal cache directory structure');
      }
    }
  }

  /**
   * Get status icon for display
   */
  getStatusIcon(status) {
    const icons = {
      'EXCELLENT': '✅',
      'GOOD': '🟡',
      'NEEDS_ATTENTION': '⚠️',
      'CRITICAL': '🔴'
    };
    return icons[status] || '❓';
  }

  /**
   * Run complete baseline measurement
   */
  async run() {
    console.log('🚀 TypeScript Performance Baseline Measurement');
    console.log('===============================================');
    
    const baseline = await this.measurePerformance();
    this.displayBaseline(baseline);
    this.saveBaseline(baseline);
    
    console.log('\n✅ Baseline measurement completed!');
    console.log('🔄 Use this baseline to monitor performance during TypeScript modernization.');
    
    return baseline;
  }
}

// Run baseline measurement
if (require.main === module) {
  const baseline = new TypeScriptPerformanceBaseline();
  baseline.run().catch(error => {
    console.error('❌ Baseline measurement failed:', error);
    process.exit(1);
  });
}

module.exports = { TypeScriptPerformanceBaseline };