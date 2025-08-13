/**
 * ============================================================================
 * CONNECTION POOL SCALING TEST SCRIPT
 * ============================================================================
 *
 * Critical validation script for testing the new database connection pool
 * configuration. Tests the scaling from 20 to 120+ connections.
 *
 * Created by: Database Architect Agent
 * Date: 2025-08-12
 * Priority: TIER 1 CRITICAL (48-hour timeline)
 * Version: 1.0.0
 */

import { sequelize, getConnectionPoolStats, checkDatabaseHealth } from "@/config/database";
import { databaseMonitoring } from "@/services/DatabaseMonitoringService";
import { logger } from "@/utils/logger";

/**
 * Test connection pool scaling and monitoring
 */
async function testConnectionPoolScaling(): Promise<void> {
  logger.info("🧪 Starting connection pool scaling test...");

  try {
    // 1. Test initial connection
    logger.info("1. Testing initial database connection...");
    await sequelize.authenticate();
    logger.info("✅ Database connection successful");

    // 2. Get initial pool statistics
    logger.info("2. Getting initial connection pool statistics...");
    const initialStats = await getConnectionPoolStats();
    logger.info("📊 Initial Pool Stats:", {
      total: initialStats.pool.total,
      active: initialStats.pool.active,
      idle: initialStats.pool.idle,
      utilization: `${initialStats.pool.utilization}%`,
      status: initialStats.status,
      config: initialStats.config,
    });

    // 3. Test enhanced health check
    logger.info("3. Testing enhanced database health check...");
    const healthCheck = await checkDatabaseHealth();
    logger.info("🏥 Health Check Results:", {
      status: healthCheck.status,
      connectionTime: healthCheck.details?.connectionTime,
      poolStatus: healthCheck.connectionPool?.status,
    });

    // 4. Start database monitoring
    logger.info("4. Starting database monitoring service...");
    databaseMonitoring.startMonitoring(10000); // Monitor every 10 seconds

    // Set up monitoring event listeners for testing
    databaseMonitoring.on("metrics", (metrics) => {
      logger.info("📈 Database Metrics:", {
        timestamp: metrics.timestamp,
        poolUtilization: `${metrics.connectionPool.utilization}%`,
        activeConnections: metrics.connectionPool.active,
        queryPerformance: metrics.queryPerformance.avgResponseTime,
      });
    });

    databaseMonitoring.on("alert", (alert) => {
      logger.warn(`🚨 Database Alert [${alert.level}]: ${alert.message}`, alert.context);
    });

    // 5. Simulate load by creating multiple concurrent connections
    logger.info("5. Simulating production load with concurrent connections...");
    
    const connectionTests = [];
    const numberOfConcurrentQueries = 50; // Test with 50 concurrent queries

    for (let i = 0; i < numberOfConcurrentQueries; i++) {
      connectionTests.push(
        sequelize.query("SELECT NOW() as test_time, :queryId as query_id", {
          replacements: { queryId: `test_${i}` },
        })
      );
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(connectionTests);
    const endTime = Date.now();

    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    logger.info("⚡ Load Test Results:", {
      duration: `${endTime - startTime}ms`,
      totalQueries: numberOfConcurrentQueries,
      successful,
      failed,
      successRate: `${Math.round((successful / numberOfConcurrentQueries) * 100)}%`,
    });

    // 6. Get final pool statistics after load test
    logger.info("6. Getting final connection pool statistics...");
    const finalStats = await getConnectionPoolStats();
    logger.info("📊 Final Pool Stats:", {
      total: finalStats.pool.total,
      active: finalStats.pool.active,
      idle: finalStats.pool.idle,
      utilization: `${finalStats.pool.utilization}%`,
      status: finalStats.status,
    });

    // 7. Get connection pool health assessment
    logger.info("7. Getting connection pool health assessment...");
    const poolHealth = await databaseMonitoring.getConnectionPoolHealth();
    logger.info("🏥 Pool Health Assessment:", {
      status: poolHealth.status,
      summary: poolHealth.summary,
      recommendations: poolHealth.recommendations,
    });

    // 8. Validate configuration meets requirements
    logger.info("8. Validating configuration meets production requirements...");
    
    const meetsRequirements = {
      maxConnections: finalStats.config.max >= 100,
      minConnections: finalStats.config.min >= 10,
      poolScaling: finalStats.pool.total > 20, // Should be higher than old config
      loadTestSuccess: successful >= (numberOfConcurrentQueries * 0.95), // 95% success rate
    };

    logger.info("✅ Production Requirements Validation:", meetsRequirements);

    if (Object.values(meetsRequirements).every(Boolean)) {
      logger.info("🎉 CONNECTION POOL SCALING TEST PASSED - PRODUCTION READY!");
    } else {
      logger.error("❌ CONNECTION POOL SCALING TEST FAILED - REQUIRES FIXES");
    }

    // Clean up
    setTimeout(() => {
      databaseMonitoring.stopMonitoring();
      logger.info("🧹 Test cleanup completed");
    }, 30000); // Stop monitoring after 30 seconds

  } catch (error) {
    logger.error("❌ Connection pool scaling test failed:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Connection pool stress test
 */
async function stressTestConnectionPool(): Promise<void> {
  logger.info("💪 Starting connection pool stress test...");

  try {
    const stressTests = [];
    const numberOfStressQueries = 200; // Heavy load test

    // Create stress load with complex queries
    for (let i = 0; i < numberOfStressQueries; i++) {
      stressTests.push(
        sequelize.query(`
          SELECT 
            NOW() as stress_time, 
            :queryId as query_id,
            generate_series(1, 100) as series,
            md5(random()::text) as random_hash
        `, {
          replacements: { queryId: `stress_${i}` },
        })
      );
    }

    const stressStartTime = Date.now();
    const stressResults = await Promise.allSettled(stressTests);
    const stressEndTime = Date.now();

    const stressSuccessful = stressResults.filter(r => r.status === "fulfilled").length;
    const stressFailed = stressResults.filter(r => r.status === "rejected").length;

    logger.info("💪 Stress Test Results:", {
      duration: `${stressEndTime - stressStartTime}ms`,
      avgQueryTime: `${Math.round((stressEndTime - stressStartTime) / numberOfStressQueries)}ms`,
      totalQueries: numberOfStressQueries,
      successful: stressSuccessful,
      failed: stressFailed,
      successRate: `${Math.round((stressSuccessful / numberOfStressQueries) * 100)}%`,
    });

    // Validate stress test results
    const stressTestPassed = {
      successRate: (stressSuccessful / numberOfStressQueries) >= 0.90, // 90% success under stress
      avgQueryTime: ((stressEndTime - stressStartTime) / numberOfStressQueries) < 1000, // < 1s avg
      noConnectionErrors: stressFailed === 0,
    };

    logger.info("💪 Stress Test Validation:", stressTestPassed);

    if (Object.values(stressTestPassed).every(Boolean)) {
      logger.info("🎉 STRESS TEST PASSED - CONNECTION POOL HANDLES PRODUCTION LOAD!");
    } else {
      logger.warn("⚠️ STRESS TEST WARNINGS - MONITOR CLOSELY IN PRODUCTION");
    }

  } catch (error) {
    logger.error("❌ Connection pool stress test failed:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  async function runTests() {
    try {
      await testConnectionPoolScaling();
      await stressTestConnectionPool();
      
      logger.info("🏁 All connection pool tests completed");
      process.exit(0);
    } catch (error) {
      logger.error("❌ Test suite failed:", error);
      process.exit(1);
    }
  }

  runTests();
}

export { testConnectionPoolScaling, stressTestConnectionPool };