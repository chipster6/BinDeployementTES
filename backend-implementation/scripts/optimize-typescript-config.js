#!/usr/bin/env node

/**
 * TypeScript Configuration Optimizer for Modernization
 * 
 * Optimizes TypeScript configuration during the 6,416+ type safety improvements
 * to maintain build performance under 30 seconds while ensuring comprehensive
 * type checking and modernization success.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TypeScriptConfigOptimizer {
  constructor() {
    this.PROJECT_ROOT = process.cwd();
    this.baseConfig = this.loadConfig('tsconfig.json');
    this.optimizations = [];
  }

  /**
   * Load TypeScript configuration file
   */
  loadConfig(configFile) {
    try {
      const configPath = path.join(this.PROJECT_ROOT, configFile);
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error(`❌ Failed to load ${configFile}:`, error.message);
      return null;
    }
  }

  /**
   * Save optimized configuration
   */
  saveConfig(config, filename) {
    try {
      const configPath = path.join(this.PROJECT_ROOT, filename);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`✅ Optimized configuration saved to: ${filename}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save ${filename}:`, error.message);
      return false;
    }
  }

  /**
   * Apply incremental compilation optimizations
   */
  applyIncrementalOptimizations(config) {
    console.log('🔧 Applying incremental compilation optimizations...');
    
    const optimizations = {
      incremental: true,
      tsBuildInfoFile: './dist/.tsbuildinfo.optimized',
      assumeChangesOnlyAffectDirectDependencies: true
    };

    Object.assign(config.compilerOptions, optimizations);
    this.optimizations.push('Enhanced incremental compilation with dependency tracking');
    
    return config;
  }

  /**
   * Apply memory optimization settings
   */
  applyMemoryOptimizations(config) {
    console.log('🧠 Applying memory optimization settings...');
    
    const memoryOptimizations = {
      skipLibCheck: true,
      preserveWatchOutput: true,
      // Disable source maps during fixing phase for memory efficiency
      sourceMap: false,
      declarationMap: false,
      declaration: false,
      removeComments: true
    };

    Object.assign(config.compilerOptions, memoryOptimizations);
    this.optimizations.push('Memory usage optimization for large-scale type checking');
    
    return config;
  }

  /**
   * Apply watch mode optimizations
   */
  applyWatchOptimizations(config) {
    console.log('👀 Applying watch mode optimizations...');
    
    const watchOptimizations = {
      watchFile: 'priorityPollingInterval',
      watchDirectory: 'dynamicPriorityPolling',
      fallbackPolling: 'dynamicPriority',
      synchronousWatchDirectory: true,
      excludeDirectories: ['**/node_modules', 'dist', 'coverage'],
      excludeFiles: ['**/*.test.ts', '**/*.spec.ts']
    };

    config.watchOptions = watchOptimizations;
    this.optimizations.push('Watch mode performance optimization for rapid iteration');
    
    return config;
  }

  /**
   * Apply strictness modernization settings
   */
  applyStrictnessSettings(config) {
    console.log('🎯 Applying strictness modernization settings...');
    
    const strictnessSettings = {
      strict: true,
      noImplicitAny: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      noImplicitThis: true,
      noImplicitOverride: true,
      useUnknownInCatchVariables: true,
      allowUnreachableCode: false,
      allowUnusedLabels: false,
      noErrorTruncation: true
    };

    Object.assign(config.compilerOptions, strictnessSettings);
    this.optimizations.push('Enhanced TypeScript strictness for comprehensive modernization');
    
    return config;
  }

  /**
   * Apply performance-focused exclusions
   */
  applyPerformanceExclusions(config) {
    console.log('⚡ Applying performance-focused exclusions...');
    
    // Include test files for comprehensive type checking during modernization
    config.include = [
      'src/**/*',
      'tests/**/*.ts'
    ];
    
    // Minimal exclusions during fixing phase
    config.exclude = [
      'node_modules',
      'dist',
      'coverage'
    ];

    this.optimizations.push('Optimized file inclusion/exclusion for modernization phase');
    
    return config;
  }

  /**
   * Test configuration performance
   */
  async testConfigurationPerformance(configFile) {
    console.log(`🧪 Testing performance of ${configFile}...`);
    
    const startTime = Date.now();
    
    try {
      execSync(`npx tsc --noEmit --project ${configFile}`, {
        cwd: this.PROJECT_ROOT,
        timeout: 180000, // 3 minute timeout
        stdio: 'pipe'
      });
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ Configuration test completed in ${duration.toFixed(2)}s`);
      
      return {
        success: true,
        duration,
        status: duration <= 30 ? 'EXCELLENT' : duration <= 60 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
      };
      
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const errorOutput = String(error.stderr || error.stdout || error.message || '');
      const errorCount = (errorOutput.match(/error TS\d+:/g) || []).length;
      
      console.log(`⚠️  Configuration test completed with errors in ${duration.toFixed(2)}s (${errorCount} errors)`);
      
      return {
        success: false,
        duration,
        errorCount,
        status: duration <= 30 ? 'GOOD_WITH_ERRORS' : duration <= 60 ? 'ACCEPTABLE' : 'SLOW'
      };
    }
  }

  /**
   * Generate multiple optimized configurations
   */
  async generateOptimizedConfigurations() {
    console.log('🚀 Generating optimized TypeScript configurations...');
    console.log('==================================================');
    
    if (!this.baseConfig) {
      console.error('❌ Cannot proceed without base configuration');
      return;
    }

    // Configuration 1: Development-optimized (fastest iteration)
    console.log('\n1️⃣  Creating development-optimized configuration...');
    const devConfig = JSON.parse(JSON.stringify(this.baseConfig));
    this.applyIncrementalOptimizations(devConfig);
    this.applyMemoryOptimizations(devConfig);
    this.applyWatchOptimizations(devConfig);
    
    // Enable source maps for development
    devConfig.compilerOptions.sourceMap = true;
    devConfig.compilerOptions.skipLibCheck = true;
    
    this.saveConfig(devConfig, 'tsconfig.dev-optimized.json');
    const devPerformance = await this.testConfigurationPerformance('tsconfig.dev-optimized.json');

    // Configuration 2: Modernization-optimized (comprehensive type checking)
    console.log('\n2️⃣  Creating modernization-optimized configuration...');
    const modernConfig = JSON.parse(JSON.stringify(this.baseConfig));
    this.applyIncrementalOptimizations(modernConfig);
    this.applyMemoryOptimizations(modernConfig);
    this.applyStrictnessSettings(modernConfig);
    this.applyPerformanceExclusions(modernConfig);
    
    // Set specific build info file for modernization
    modernConfig.compilerOptions.tsBuildInfoFile = './dist/.tsbuildinfo.modernization';
    
    this.saveConfig(modernConfig, 'tsconfig.modernization.json');
    const modernPerformance = await this.testConfigurationPerformance('tsconfig.modernization.json');

    // Configuration 3: Production-optimized (fastest builds)
    console.log('\n3️⃣  Creating production-optimized configuration...');
    const prodConfig = JSON.parse(JSON.stringify(this.baseConfig));
    this.applyIncrementalOptimizations(prodConfig);
    this.applyMemoryOptimizations(prodConfig);
    
    // Production-specific optimizations
    prodConfig.compilerOptions.skipLibCheck = true;
    prodConfig.compilerOptions.sourceMap = false;
    prodConfig.compilerOptions.removeComments = true;
    prodConfig.compilerOptions.tsBuildInfoFile = './dist/.tsbuildinfo.production';
    
    // Exclude development files
    prodConfig.exclude = [
      'node_modules',
      'dist',
      'coverage',
      'tests',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.dev.ts'
    ];
    
    this.saveConfig(prodConfig, 'tsconfig.production-optimized.json');
    const prodPerformance = await this.testConfigurationPerformance('tsconfig.production-optimized.json');

    // Generate performance summary
    this.generatePerformanceSummary({
      development: { config: 'tsconfig.dev-optimized.json', ...devPerformance },
      modernization: { config: 'tsconfig.modernization.json', ...modernPerformance },
      production: { config: 'tsconfig.production-optimized.json', ...prodPerformance }
    });
  }

  /**
   * Generate performance summary report
   */
  generatePerformanceSummary(results) {
    console.log('\n📊 PERFORMANCE SUMMARY');
    console.log('=====================');
    
    Object.entries(results).forEach(([phase, result]) => {
      const icon = this.getPerformanceIcon(result.status);
      console.log(`\n${phase.toUpperCase()}:`);
      console.log(`   Config: ${result.config}`);
      console.log(`   Duration: ${result.duration.toFixed(2)}s`);
      console.log(`   Status: ${icon} ${result.status}`);
      
      if (result.errorCount !== undefined) {
        console.log(`   Errors: ${result.errorCount}`);
      }
    });

    console.log('\n💡 USAGE RECOMMENDATIONS:');
    console.log('   • Use tsconfig.dev-optimized.json for fastest development iteration');
    console.log('   • Use tsconfig.modernization.json for comprehensive type checking during fixes');
    console.log('   • Use tsconfig.production-optimized.json for fastest production builds');
    
    console.log('\n🎯 MODERNIZATION STRATEGY:');
    console.log('   1. Start with dev-optimized config for rapid prototyping');
    console.log('   2. Switch to modernization config for systematic type fixing');
    console.log('   3. Validate with production config before deployment');
    
    // Save summary to file
    const summaryPath = path.join(this.PROJECT_ROOT, 'typescript-config-optimization-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      optimizations: this.optimizations,
      recommendations: [
        'Use tsconfig.dev-optimized.json for fastest development iteration',
        'Use tsconfig.modernization.json for comprehensive type checking during fixes',
        'Use tsconfig.production-optimized.json for fastest production builds'
      ]
    }, null, 2));
    
    console.log(`\n💾 Summary saved to: typescript-config-optimization-summary.json`);
  }

  /**
   * Get performance status icon
   */
  getPerformanceIcon(status) {
    const icons = {
      'EXCELLENT': '✅',
      'GOOD': '🟡',
      'GOOD_WITH_ERRORS': '🟠',
      'ACCEPTABLE': '⚠️',
      'NEEDS_IMPROVEMENT': '🔴',
      'SLOW': '🐌'
    };
    return icons[status] || '❓';
  }

  /**
   * Run complete optimization process
   */
  async run() {
    console.log('🎯 TypeScript Configuration Optimizer for Modernization');
    console.log('======================================================');
    console.log('Optimizing configurations for 6,416+ type safety improvements...\n');
    
    await this.generateOptimizedConfigurations();
    
    console.log('\n✅ Configuration optimization completed!');
    console.log('🚀 Ready for enterprise-scale TypeScript modernization.');
  }
}

// Run optimization
if (require.main === module) {
  const optimizer = new TypeScriptConfigOptimizer();
  optimizer.run().catch(error => {
    console.error('❌ Configuration optimization failed:', error);
    process.exit(1);
  });
}

module.exports = { TypeScriptConfigOptimizer };