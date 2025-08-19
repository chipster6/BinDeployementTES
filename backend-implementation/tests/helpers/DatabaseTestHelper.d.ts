import { Sequelize, Transaction } from 'sequelize';
export declare class DatabaseTestHelper {
    private static testSequelize;
    private static isInitialized;
    static initialize(): Promise<void>;
    static getDatabase(): Sequelize;
    static createTransaction(): Promise<Transaction>;
    static cleanup(): Promise<void>;
    static reset(): Promise<void>;
    static close(): Promise<void>;
    static withRollbackTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T>;
    static getTableRowCount(tableName: string): Promise<number>;
    static tableExists(tableName: string): Promise<boolean>;
    static getTableNames(): Promise<string[]>;
    static query(sql: string, replacements?: any): Promise<any>;
    static seedTestData(): Promise<void>;
    static getDatabaseStats(): Promise<any>;
}
export declare class DatabaseTestUtils {
    static waitForDatabase(operation: () => Promise<any>, maxAttempts?: number, delayMs?: number): Promise<any>;
    static assertTableRowCount(tableName: string, expectedCount: number): Promise<void>;
    static assertDatabaseEmpty(): Promise<void>;
}
export default DatabaseTestHelper;
//# sourceMappingURL=DatabaseTestHelper.d.ts.map