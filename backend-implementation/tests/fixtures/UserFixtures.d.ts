import { Transaction } from 'sequelize';
import { User, UserRole, UserStatus } from '@/models/User';
export interface UserTestData {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: UserRole;
    status?: UserStatus;
    organizationId?: string;
    mfaEnabled?: boolean;
    isActive?: boolean;
    requiresPasswordChange?: boolean;
}
export declare class UserFixtures {
    private counter;
    getUserData(overrides?: UserTestData): any;
    createUser(userData?: UserTestData, transaction?: Transaction): Promise<User>;
    createUsers(count: number, baseData?: UserTestData, transaction?: Transaction): Promise<User[]>;
    createUserWithRole(role: UserRole, organizationId?: string, transaction?: Transaction): Promise<User>;
    createAdminUser(organizationId?: string, transaction?: Transaction): Promise<User>;
    createDriverUser(organizationId?: string, transaction?: Transaction): Promise<User>;
    createCustomerUser(organizationId?: string, transaction?: Transaction): Promise<User>;
    createLockedUser(transaction?: Transaction): Promise<User>;
    createMfaUser(transaction?: Transaction): Promise<User>;
    getAuthTestScenarios(): {
        validUser: UserTestData;
        invalidEmail: UserTestData;
        invalidPassword: UserTestData;
        lockedUser: UserTestData;
        inactiveUser: UserTestData;
    };
    getPasswordTestCases(): Array<{
        password: string;
        valid: boolean;
        description: string;
    }>;
    getRoleTestData(): Array<{
        role: UserRole;
        resource: string;
        action: string;
        allowed: boolean;
    }>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
    private generateUUID;
}
export default UserFixtures;
//# sourceMappingURL=UserFixtures.d.ts.map