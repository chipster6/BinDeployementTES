import { Transaction } from 'sequelize';
import { AuditLog } from '@/models/AuditLog';
export interface AuditLogTestData {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    changes?: any;
    metadata?: any;
}
export declare class AuditLogFixtures {
    private counter;
    getAuditLogData(overrides?: AuditLogTestData): any;
    createAuditLog(logData?: AuditLogTestData, transaction?: Transaction): Promise<AuditLog>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
    private generateUUID;
}
export default AuditLogFixtures;
//# sourceMappingURL=AuditLogFixtures.d.ts.map