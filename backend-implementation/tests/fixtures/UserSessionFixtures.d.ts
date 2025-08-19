import { Transaction } from 'sequelize';
import { UserSession } from '@/models/UserSession';
export interface UserSessionTestData {
    userId?: string;
    token?: string;
    expiresAt?: Date;
    isActive?: boolean;
    metadata?: any;
}
export declare class UserSessionFixtures {
    private counter;
    getSessionData(overrides?: UserSessionTestData): any;
    createSession(sessionData?: UserSessionTestData, transaction?: Transaction): Promise<UserSession>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
    private generateUUID;
}
export default UserSessionFixtures;
//# sourceMappingURL=UserSessionFixtures.d.ts.map