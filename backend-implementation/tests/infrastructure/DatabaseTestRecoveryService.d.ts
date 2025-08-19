import { Transaction } from 'sequelize';
import { EventEmitter } from 'events';
export declare enum DatabaseRecoveryStrategy {
    RECONNECT = "reconnect",
    RESET_POOL = "reset_pool",
    FULL_RESET = "full_reset",
    MIGRATE_REPAIR = "migrate_repair",
    BACKUP_RESTORE = "backup_restore",
    DEADLOCK_RESOLVE = "deadlock_resolve",
    CONSTRAINT_REPAIR = "constraint_repair"
}
export declare enum DatabaseHealthStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    FAILING = "failing",
    CRITICAL = "critical",
    OFFLINE = "offline"
}
export interface DatabaseTestContext {
    testId: string;
    operation: string;
    tableName?: string;
    transactionId?: string;
    isolationLevel?: string;
    timeout: number;
    retryCount: number;
    metadata: Record<string, any>;
}
export interface DatabaseRecoveryResult {
    strategy: DatabaseRecoveryStrategy;
    success: boolean;
    duration: number;
    error?: Error;
    metrics: {
        connectionTime: number;
        queryTime?: number;
        transactionTime?: number;
    };
    recommendations: string[];
}
export interface DatabaseHealthMetrics {
    status: DatabaseHealthStatus;
    connectionCount: number;
    activeTransactions: number;
    averageResponseTime: number;
    errorRate: number;
    deadlockCount: number;
    connectionPoolUtilization: number;
    lastSuccessfulOperation: Date;
    consecutiveFailures: number;
    recommendations: string[];
}
export declare class DatabaseTestRecoveryService extends EventEmitter {
    private sequelize;
    private activeTransactions;
    private connectionPool;
    private healthMetrics;
    private recoveryAttempts;
    private circuitBreakerState;
    private circuitBreakerFailures;
    private circuitBreakerLastFailure;
    private readonly circuitBreakerThreshold;
    private readonly circuitBreakerTimeout;
    private performanceBaselines;
    constructor();
    executeWithRecovery<T>(context: DatabaseTestContext, operation: () => Promise<T>): Promise<T>;
    createResilientTransaction(context: DatabaseTestContext, isolationLevel?: string): Promise<Transaction>;
    safeRollback(transactionId: string): Promise<boolean>;
    safeCommit(transactionId: string): Promise<boolean>;
    performComprehensiveCleanup(testId: string): Promise<void>;
    getHealthStatus(): DatabaseHealthMetrics;
    validateSchemaIntegrity(): Promise<{
        valid: boolean;
        issues: string[];
        recommendations: string[];
    }>;
    private initializeConnection;
    private analyzeErrorAndSelectStrategy;
    private attemptRecovery;
    private executeReconnectRecovery;
    private executeResetPoolRecovery;
    private executeFullResetRecovery;
    private executeMigrateRepairRecovery;
    private executeDeadlockResolveRecovery;
    private executeConstraintRepairRecovery;
    private rollbackActiveTransactions;
    private clearTestDataWithConflictResolution;
    private resetSequences;
    private validateDatabaseIntegrity;
    private resetConnectionPool;
    private performEmergencyCleanup;
    private validateForeignKeyConstraints;
    private validateIndexes;
    private initializeHealthMetrics;
    private startHealthMonitoring;
    private setupRecoveryStrategies;
    private updateHealthMetrics;
    private generateHealthRecommendations;
    private trackOperationStart;
    private recordOperationSuccess;
    private recordOperationFailure;
    private updateCircuitBreakerOnSuccess;
    private updateCircuitBreakerOnFailure;
    private generateTransactionId;
    private executeWithTimeout;
    private delay;
}
export declare const databaseTestRecoveryService: DatabaseTestRecoveryService;
export default DatabaseTestRecoveryService;
//# sourceMappingURL=DatabaseTestRecoveryService.d.ts.map