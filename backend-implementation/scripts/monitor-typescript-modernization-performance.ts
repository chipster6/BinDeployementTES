#!/usr/bin/env ts-node

/**
 * ============================================================================
 * TYPESCRIPT MODERNIZATION PERFORMANCE MONITOR
 * ============================================================================
 *
 * Real-time performance monitoring for TypeScript strictness modernization.
 * Tracks build performance during the 6,416+ type safety improvements to ensure
 * compilation times remain under 30 seconds.
 *
 * Monitoring Features:
 * - Real-time build time tracking
 * - Memory usage monitoring during compilation
 * - Type error count tracking
 * - Cache efficiency monitoring
 * - Performance degradation alerts
 * - Optimization recommendations
 *
 * Performance Optimization Specialist
 * Date: 2025-08-20
 */

import { performance } from 'perf_hooks';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface PerformanceSnapshot {
  timestamp: string;
  compilationTime: number;
  memoryUsage: number;
  typeErrors: number;
  filesProcessed: number;
  cacheHitRate: number;
  cpuUsage: number;
}

interface PerformanceThresholds {
  maxCompilationTime: number; // seconds
  maxMemoryUsage: number; // MB
  maxTypeErrors: number;
  minCacheHitRate: number; // percentage
}

class TypeScriptModernizationMonitor {
  private readonly PROJECT_ROOT = process.cwd();
  private readonly PERFORMANCE_LOG_PATH = path.join(this.PROJECT_ROOT, 'performance-monitoring.json');
  
  private readonly THRESHOLDS: PerformanceThresholds = {
    maxCompilationTime: 30,
    maxMemoryUsage: 2048,
    maxTypeErrors: 50,
    minCacheHitRate: 60
  };

  private performanceHistory: PerformanceSnapshot[] = [];

  /**
   * Start continuous performance monitoring
   */
  async startMonitoring(): Promise<void> {
    console.log('🚀 Starting TypeScript Modernization Performance Monitoring...');
    console.log(`📊 Thresholds: ${this.THRESHOLDS.maxCompilationTime}s build, ${this.THRESHOLDS.maxMemoryUsage}MB memory, ${this.THRESHOLDS.maxTypeErrors} errors`);
    
    // Load existing performance history
    await this.loadPerformanceHistory();
    
    // Start monitoring loop
    setInterval(async () => {
      await this.performPerformanceCheck();
    }, 30000); // Check every 30 seconds

    // Initial check
    await this.performPerformanceCheck();
    
    console.log('✅ Performance monitoring active. Press Ctrl+C to stop.');
  }

  /**
   * Perform a single performance check
   */
  private async performPerformanceCheck(): Promise<void> {
    console.log('\n🔍 Running performance check...');
    
    const snapshot = await this.capturePerformanceSnapshot();
    this.performanceHistory.push(snapshot);
    
    // Analyze performance
    this.analyzePerformance(snapshot);
    
    // Save performance data
    await this.savePerformanceHistory();
    
    // Display current metrics
    this.displayCurrentMetrics(snapshot);
  }

  /**
   * Capture current performance snapshot
   */
  private async capturePerformanceSnapshot(): Promise<PerformanceSnapshot> {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed;
    
    let compilationTime = 0;
    let typeErrors = 0;
    let filesProcessed = 0;

    try {
      // Run TypeScript compilation
      const compilationStart = performance.now();
      
      try {
        execSync('npx tsc --noEmit --incremental', {
          cwd: this.PROJECT_ROOT,
          timeout: 120000, // 2 minute timeout
          stdio: 'pipe'
        });
      } catch (error) {
        // Compilation may fail due to type errors, which is expected during modernization
        const errorOutput = error instanceof Error ? error.message : '';
        typeErrors = this.countTypeErrors(errorOutput);
      }
      
      compilationTime = (performance.now() - compilationStart) / 1000;
      
      // Count TypeScript files
      filesProcessed = this.countTypeScriptFiles();
      
    } catch (error) {
      console.error('❌ Error during performance check:', error);
      compilationTime = (performance.now() - startTime) / 1000;
    }

    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryUsage = (memoryAfter - memoryBefore) / 1024 / 1024; // Convert to MB
    
    return {
      timestamp: new Date().toISOString(),
      compilationTime,
      memoryUsage: Math.max(memoryUsage, 0),
      typeErrors,
      filesProcessed,
      cacheHitRate: await this.calculateCacheHitRate(),
      cpuUsage: await this.getCPUUsage()
    };
  }

  /**
   * Analyze performance and provide alerts/recommendations
   */
  private analyzePerformance(snapshot: PerformanceSnapshot): void {
    const alerts: string[] = [];
    const recommendations: string[] = [];

    // Check compilation time threshold
    if (snapshot.compilationTime > this.THRESHOLDS.maxCompilationTime) {
      alerts.push(`⚠️  Build time exceeded threshold: ${snapshot.compilationTime.toFixed(2)}s > ${this.THRESHOLDS.maxCompilationTime}s`);
      recommendations.push('Consider enabling incremental compilation or using transpile-only mode');
    }

    // Check memory usage
    if (snapshot.memoryUsage > this.THRESHOLDS.maxMemoryUsage) {
      alerts.push(`⚠️  Memory usage exceeded threshold: ${snapshot.memoryUsage.toFixed(2)}MB > ${this.THRESHOLDS.maxMemoryUsage}MB`);
      recommendations.push('Consider using project references or excluding test files from compilation');
    }

    // Check type errors
    if (snapshot.typeErrors > this.THRESHOLDS.maxTypeErrors) {
      alerts.push(`⚠️  Type error count high: ${snapshot.typeErrors} > ${this.THRESHOLDS.maxTypeErrors}`);
      recommendations.push('Focus on resolving type errors before further optimization');
    }

    // Check cache hit rate
    if (snapshot.cacheHitRate < this.THRESHOLDS.minCacheHitRate) {
      alerts.push(`⚠️  Low cache hit rate: ${snapshot.cacheHitRate.toFixed(1)}% < ${this.THRESHOLDS.minCacheHitRate}%`);
      recommendations.push('Ensure incremental compilation is properly configured and .tsbuildinfo is preserved');
    }

    // Display alerts and recommendations
    if (alerts.length > 0) {
      console.log('\n🚨 PERFORMANCE ALERTS:');
      alerts.forEach(alert => console.log(alert));
      
      if (recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        recommendations.forEach(rec => console.log(`   • ${rec}`));
      }
    }

    // Check for performance trends
    this.analyzeTrends();
  }

  /**
   * Analyze performance trends over time
   */
  private analyzeTrends(): void {
    if (this.performanceHistory.length < 3) return;

    const recent = this.performanceHistory.slice(-3);
    const buildTimes = recent.map(s => s.compilationTime);
    const memoryUsages = recent.map(s => s.memoryUsage);

    // Check for degrading build times
    const buildTimesIncreasing = buildTimes.length >= 2 && buildTimes.every((time, i) => {
      if (i === 0) return true;
      const previousTime = buildTimes[i - 1];
      return previousTime !== undefined && time > previousTime;
    });
    if (buildTimesIncreasing) {
      console.log('📈 WARNING: Build times are consistently increasing');
    }

    // Check for memory growth
    const memoryIncreasing = memoryUsages.length >= 2 && memoryUsages.every((memory, i) => {
      if (i === 0) return true;
      const previousMemory = memoryUsages[i - 1];
      return previousMemory !== undefined && memory > previousMemory;
    });
    if (memoryIncreasing) {
      console.log('📈 WARNING: Memory usage is consistently increasing');
    }

    // Check for improvements
    const buildTimesImproving = buildTimes.length >= 2 && buildTimes.every((time, i) => {
      if (i === 0) return true;
      const previousTime = buildTimes[i - 1];
      return previousTime !== undefined && time < previousTime;
    });
    if (buildTimesImproving) {
      console.log('📉 ✅ Build times are improving!');
    }
  }

  /**
   * Display current performance metrics
   */
  private displayCurrentMetrics(snapshot: PerformanceSnapshot): void {
    console.log('\n📊 CURRENT PERFORMANCE METRICS:');
    console.log(`   Compilation Time: ${snapshot.compilationTime.toFixed(2)}s`);
    console.log(`   Memory Usage: ${snapshot.memoryUsage.toFixed(2)}MB`);
    console.log(`   Type Errors: ${snapshot.typeErrors}`);
    console.log(`   Files Processed: ${snapshot.filesProcessed}`);
    console.log(`   Cache Hit Rate: ${snapshot.cacheHitRate.toFixed(1)}%`);
    console.log(`   CPU Usage: ${snapshot.cpuUsage.toFixed(1)}%`);
    
    // Performance status indicator
    const isPerformant = 
      snapshot.compilationTime <= this.THRESHOLDS.maxCompilationTime &&
      snapshot.memoryUsage <= this.THRESHOLDS.maxMemoryUsage;
      
    console.log(`   Status: ${isPerformant ? '✅ PERFORMANT' : '⚠️  NEEDS ATTENTION'}`);
  }

  /**
   * Count TypeScript files in the project
   */
  private countTypeScriptFiles(): number {
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
  private countTypeErrors(output: string): number {
    const errorMatches = output.match(/error TS\d+:/g);
    return errorMatches ? errorMatches.length : 0;
  }

  /**
   * Calculate build cache hit rate
   */
  private async calculateCacheHitRate(): Promise<number> {
    try {
      const buildInfoPath = path.join(this.PROJECT_ROOT, 'dist', '.tsbuildinfo');
      
      if (!fs.existsSync(buildInfoPath)) {
        return 0;
      }
      
      const stats = fs.statSync(buildInfoPath);
      const age = Date.now() - stats.mtime.getTime();
      
      // Estimate cache effectiveness based on file age and recent changes
      return Math.max(0, Math.min(100, 100 - (age / 1000 / 60 / 5))); // Decay over 5 minutes
      
    } catch {
      return 0;
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = (endUsage.user + endUsage.system) / 1000; // Convert to milliseconds
        const cpuPercent = (totalUsage / 1000) * 100; // Convert to percentage
        resolve(Math.min(100, cpuPercent));
      }, 1000);
    });
  }

  /**
   * Load existing performance history
   */
  private async loadPerformanceHistory(): Promise<void> {
    try {
      if (fs.existsSync(this.PERFORMANCE_LOG_PATH)) {
        const data = fs.readFileSync(this.PERFORMANCE_LOG_PATH, 'utf-8');
        this.performanceHistory = JSON.parse(data);
        console.log(`📚 Loaded ${this.performanceHistory.length} historical performance entries`);
      }
    } catch (error) {
      console.log('📝 Starting fresh performance monitoring (no previous data)');
      this.performanceHistory = [];
    }
  }

  /**
   * Save performance history to disk
   */
  private async savePerformanceHistory(): Promise<void> {
    try {
      // Keep only last 100 entries to prevent file from growing too large
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-100);
      }
      
      fs.writeFileSync(
        this.PERFORMANCE_LOG_PATH,
        JSON.stringify(this.performanceHistory, null, 2)
      );
    } catch (error) {
      console.error('❌ Failed to save performance history:', error);
    }
  }

  /**
   * Generate performance summary report
   */
  generateSummaryReport(): void {
    if (this.performanceHistory.length === 0) {
      console.log('📊 No performance data available for report');
      return;
    }

    const recent = this.performanceHistory.slice(-10);
    const avgCompilation = recent.reduce((sum, s) => sum + s.compilationTime, 0) / recent.length;
    const avgMemory = recent.reduce((sum, s) => sum + s.memoryUsage, 0) / recent.length;
    const avgErrors = recent.reduce((sum, s) => sum + s.typeErrors, 0) / recent.length;
    
    console.log('\n📈 PERFORMANCE SUMMARY (Last 10 Checks):');
    console.log(`   Average Compilation Time: ${avgCompilation.toFixed(2)}s`);
    console.log(`   Average Memory Usage: ${avgMemory.toFixed(2)}MB`);
    console.log(`   Average Type Errors: ${avgErrors.toFixed(0)}`);
    console.log(`   Total Checks: ${this.performanceHistory.length}`);
    
    const reportPath = path.join(this.PROJECT_ROOT, 'typescript-performance-summary.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        totalChecks: this.performanceHistory.length,
        averageCompilationTime: avgCompilation,
        averageMemoryUsage: avgMemory,
        averageTypeErrors: avgErrors,
        generatedAt: new Date().toISOString()
      },
      recentHistory: recent,
      thresholds: this.THRESHOLDS
    }, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
}

// Script execution
async function main() {
  const monitor = new TypeScriptModernizationMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping performance monitoring...');
    monitor.generateSummaryReport();
    process.exit(0);
  });

  // Start monitoring
  await monitor.startMonitoring();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Monitoring failed:', error);
    process.exit(1);
  });
}

export { TypeScriptModernizationMonitor };