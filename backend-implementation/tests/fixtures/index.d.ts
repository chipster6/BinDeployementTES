import { Transaction } from 'sequelize';
import { UserFixtures } from './UserFixtures';
import { OrganizationFixtures } from './OrganizationFixtures';
import { CustomerFixtures } from './CustomerFixtures';
import { BinFixtures } from './BinFixtures';
import { VehicleFixtures } from './VehicleFixtures';
import { DriverFixtures } from './DriverFixtures';
import { RouteFixtures } from './RouteFixtures';
import { ServiceEventFixtures } from './ServiceEventFixtures';
import { AuditLogFixtures } from './AuditLogFixtures';
import { UserSessionFixtures } from './UserSessionFixtures';
export declare class TestFixtures {
    private static instance;
    users: UserFixtures;
    organizations: OrganizationFixtures;
    customers: CustomerFixtures;
    bins: BinFixtures;
    vehicles: VehicleFixtures;
    drivers: DriverFixtures;
    routes: RouteFixtures;
    serviceEvents: ServiceEventFixtures;
    auditLogs: AuditLogFixtures;
    userSessions: UserSessionFixtures;
    private constructor();
    static getInstance(): TestFixtures;
    createFullTestDataset(transaction?: Transaction): Promise<{
        organizations: any[];
        users: any[];
        customers: any[];
        bins: any[];
        vehicles: any[];
        drivers: any[];
        routes: any[];
        serviceEvents: any[];
    }>;
    cleanupAll(transaction?: Transaction): Promise<void>;
    createScenario(scenarioName: string, transaction?: Transaction): Promise<any>;
    private createRouteOptimizationScenario;
    private createCustomerManagementScenario;
    private createDriverPerformanceScenario;
    private createBinTrackingScenario;
}
export declare const testFixtures: TestFixtures;
export default testFixtures;
//# sourceMappingURL=index.d.ts.map