import { Transaction } from 'sequelize';
import { Route } from '@/models/Route';
export interface RouteTestData {
    name?: string;
    driverId?: string;
    vehicleId?: string;
    organizationId?: string;
    binIds?: string[];
    scheduledDate?: Date;
    status?: string;
}
export declare class RouteFixtures {
    private counter;
    getRouteData(overrides?: RouteTestData): any;
    createRoute(routeData?: RouteTestData, transaction?: Transaction): Promise<Route>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
    private generateUUID;
}
export default RouteFixtures;
//# sourceMappingURL=RouteFixtures.d.ts.map