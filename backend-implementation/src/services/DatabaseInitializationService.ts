/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - DATABASE INITIALIZATION SERVICE
 * ============================================================================
 *
 * Critical initialization service for database infrastructure setup.
 * Coordinates performance monitoring, optimization, and health checks.
 * 
 * TIER 1 CRITICAL INFRASTRUCTURE - 72-HOUR EMERGENCY DEPLOYMENT
 *
 * Created by: Database Architect
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { config } from "@/config";
import { initializeDatabase } from "@/config/database";
import { initializeRedis } from "@/config/redis";
import { databasePerformanceMonitor } from "@/services/DatabasePerformanceMonitor";
import { databaseOptimizationService } from "@/services/DatabaseOptimizationService";

/**
 * Database Initialization Status
 */
export interface InitializationStatus {
  database: {
    connected: boolean;
    extensions: boolean;
    indexes: boolean;
    error?: string;
  };
  redis: {
    connected: boolean;
    error?: string;
  };
  monitoring: {
    started: boolean;
    error?: string;
  };
  optimization: {
    analyzed: boolean;
    indexesCreated: boolean;
    error?: string;
  };
  overall: "initializing" | "completed" | "failed";
  startTime: Date;
  duration?: number;
}

/**
 * Database Initialization Service Class
 */
class DatabaseInitializationService {
  private initializationStatus: InitializationStatus = {
    database: { connected: false, extensions: false, indexes: false },
    redis: { connected: false },
    monitoring: { started: false },
    optimization: { analyzed: false, indexesCreated: false },
    overall: "initializing",
    startTime: new Date(),
  };

  private initialized = false;

  /**
   * CRITICAL INITIALIZATION SEQUENCE
   * Must complete successfully for production deployment
   */
  public async initializeAll(): Promise<InitializationStatus> {
    if (this.initialized) {
      logger.warn("Database initialization already completed");
      return this.initializationStatus;
    }

    const startTime = Date.now();
    this.initializationStatus.startTime = new Date();
    this.initializationStatus.overall = "initializing";

    logger.info("🚀 Starting critical database infrastructure initialization");

    try {
      // Step 1: Initialize Database Connection
      await this.initializeDatabaseConnection();

      // Step 2: Initialize Redis Connection  
      await this.initializeRedisConnection();

      // Step 3: Setup Critical Database Indexes
      if (config.app.nodeEnv !== "test") {
        await this.setupCriticalIndexes();
      }

      // Step 4: Start Performance Monitoring
      await this.startPerformanceMonitoring();

      // Step 5: Run Initial Performance Analysis
      if (config.app.nodeEnv !== "test") {
        await this.runInitialOptimizationAnalysis();
      }

      // Mark as successfully initialized
      this.initializationStatus.overall = "completed";
      this.initializationStatus.duration = Date.now() - startTime;
      this.initialized = true;

      logger.info("✅ Database infrastructure initialization completed successfully", {
        duration: `${this.initializationStatus.duration}ms`,
        database: this.initializationStatus.database,
        redis: this.initializationStatus.redis,
        monitoring: this.initializationStatus.monitoring,
        optimization: this.initializationStatus.optimization,
      });

      return this.initializationStatus;

    } catch (error) {
      this.initializationStatus.overall = "failed";
      this.initializationStatus.duration = Date.now() - startTime;

      logger.error("❌ Critical database infrastructure initialization failed", {
        error: error instanceof Error ? error.message : error,
        status: this.initializationStatus,
        duration: `${this.initializationStatus.duration}ms`,
      });

      throw error;
    }
  }

  /**
   * STEP 1: Initialize Database Connection
   */
  private async initializeDatabaseConnection(): Promise<void> {
    logger.info("🔗 Initializing database connection...");

    try {
      await initializeDatabase();
      
      this.initializationStatus.database.connected = true;
      this.initializationStatus.database.extensions = true; // Extensions created in initializeDatabase
      
      logger.info("✅ Database connection initialized successfully");

    } catch (error) {
      this.initializationStatus.database.error = error instanceof Error ? error.message : String(error);
      logger.error("❌ Database connection initialization failed:", error);
      throw error;
    }
  }

  /**
   * STEP 2: Initialize Redis Connection
   */
  private async initializeRedisConnection(): Promise<void> {
    logger.info("🔗 Initializing Redis connections...");

    try {
      await initializeRedis();
      
      this.initializationStatus.redis.connected = true;
      
      logger.info("✅ Redis connections initialized successfully");

    } catch (error) {
      this.initializationStatus.redis.error = error instanceof Error ? error.message : String(error);
      logger.error("❌ Redis connection initialization failed:", error);
      throw error;
    }
  }

  /**
   * STEP 3: Setup Critical Database Indexes
   */
  private async setupCriticalIndexes(): Promise<void> {
    logger.info("📊 Setting up critical database indexes for production performance...");

    try {
      await databaseOptimizationService.initializeCriticalIndexes();
      
      this.initializationStatus.optimization.indexesCreated = true;
      this.initializationStatus.database.indexes = true;
      
      logger.info("✅ Critical database indexes created successfully");

    } catch (error) {
      this.initializationStatus.optimization.error = error instanceof Error ? error.message : String(error);
      logger.error("❌ Critical index creation failed:", error);
      
      // Don't throw - indexes can be created later, but log as warning
      logger.warn("⚠️ Application will continue but performance may be degraded without indexes");
    }
  }

  /**
   * STEP 4: Start Performance Monitoring
   */
  private async startPerformanceMonitoring(): Promise<void> {
    logger.info("📊 Starting database performance monitoring...");

    try {
      // Start monitoring with 30-second intervals for production
      const monitoringInterval = config.app.nodeEnv === "production" ? 30000 : 60000;
      databasePerformanceMonitor.startMonitoring(monitoringInterval);
      
      this.initializationStatus.monitoring.started = true;
      
      logger.info("✅ Database performance monitoring started successfully", {
        interval: `${monitoringInterval}ms`,
      });

    } catch (error) {
      this.initializationStatus.monitoring.error = error instanceof Error ? error.message : String(error);
      logger.error("❌ Performance monitoring startup failed:", error);
      
      // Don't throw - monitoring can be started later
      logger.warn("⚠️ Application will continue but performance monitoring is disabled");
    }
  }

  /**
   * STEP 5: Run Initial Optimization Analysis
   */
  private async runInitialOptimizationAnalysis(): Promise<void> {
    logger.info("🔍 Running initial database optimization analysis...");

    try {
      // Run analysis in background to avoid blocking startup
      setTimeout(async () => {
        try {
          const analysis = await databaseOptimizationService.analyzePerformance();
          
          this.initializationStatus.optimization.analyzed = true;
          
          logger.info("✅ Initial database optimization analysis completed", {
            recommendations: analysis.recommendations.length,
            highPriorityRecommendations: analysis.recommendations.filter(r => r.priority === "high").length,
          });

          // Log critical recommendations for immediate attention
          const criticalRecommendations = analysis.recommendations.filter(r => r.priority === "high");
          if (criticalRecommendations.length > 0) {
            logger.warn("⚠️ Critical database optimization recommendations found", {
              count: criticalRecommendations.length,
              recommendations: criticalRecommendations.map(r => r.description),
            });
          }

        } catch (analysisError) {
          this.initializationStatus.optimization.error = analysisError instanceof Error ? analysisError.message : String(analysisError);
          logger.error("❌ Initial optimization analysis failed:", analysisError);
        }
      }, 5000); // Run after 5 seconds to avoid blocking startup

      logger.info("📋 Initial optimization analysis scheduled");

    } catch (error) {
      this.initializationStatus.optimization.error = error instanceof Error ? error.message : String(error);
      logger.error("❌ Optimization analysis scheduling failed:", error);
      
      // Don't throw - analysis can be run later
      logger.warn("⚠️ Application will continue but optimization analysis is disabled");
    }
  }

  /**
   * GET INITIALIZATION STATUS
   */
  public getInitializationStatus(): InitializationStatus {
    return { ...this.initializationStatus };
  }

  /**
   * CHECK IF INITIALIZATION IS COMPLETED
   */
  public isInitialized(): boolean {
    return this.initialized && this.initializationStatus.overall === "completed";
  }

  /**
   * GET HEALTH SUMMARY
   */
  public getHealthSummary(): {
    status: "healthy" | "degraded" | "critical";
    components: {
      database: "healthy" | "unhealthy";
      redis: "healthy" | "unhealthy";
      monitoring: "healthy" | "unhealthy";
      optimization: "healthy" | "degraded";
    };
    readyForProduction: boolean;
  } {
    const components = {
      database: this.initializationStatus.database.connected && 
                this.initializationStatus.database.extensions ? "healthy" : "unhealthy",
      redis: this.initializationStatus.redis.connected ? "healthy" : "unhealthy",
      monitoring: this.initializationStatus.monitoring.started ? "healthy" : "unhealthy",
      optimization: this.initializationStatus.optimization.indexesCreated ? "healthy" : "degraded",
    } as const;

    const healthyComponents = Object.values(components).filter(status => status === "healthy").length;
    const totalComponents = Object.keys(components).length;

    let status: "healthy" | "degraded" | "critical";
    if (healthyComponents === totalComponents) {
      status = "healthy";
    } else if (healthyComponents >= totalComponents - 1) {
      status = "degraded";
    } else {
      status = "critical";
    }

    const readyForProduction = components.database === "healthy" && 
                              components.redis === "healthy" &&
                              this.initialized;

    return {
      status,
      components,
      readyForProduction,
    };
  }

  /**
   * GRACEFUL SHUTDOWN
   */
  public async shutdown(): Promise<void> {
    logger.info("🔄 Shutting down database infrastructure services...");

    try {
      // Stop performance monitoring
      if (this.initializationStatus.monitoring.started) {
        databasePerformanceMonitor.stopMonitoring();
        logger.info("✅ Performance monitoring stopped");
      }

      // Note: Database and Redis connections will be closed by their respective services
      
      this.initialized = false;
      logger.info("✅ Database infrastructure shutdown completed");

    } catch (error) {
      logger.error("❌ Database infrastructure shutdown failed:", error);
      throw error;
    }
  }
}

// Singleton instance for global use
export const databaseInitializationService = new DatabaseInitializationService();
export default databaseInitializationService;