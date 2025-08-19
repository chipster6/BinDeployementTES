import { Transaction } from 'sequelize';
import { ServiceEvent } from '@/models/ServiceEvent';
export interface ServiceEventTestData {
    type?: string;
    binId?: string;
    routeId?: string;
    customerId?: string;
    status?: string;
    scheduledAt?: Date;
    completedAt?: Date;
}
export declare class ServiceEventFixtures {
    private counter;
    getServiceEventData(overrides?: ServiceEventTestData): any;
    createServiceEvent(eventData?: ServiceEventTestData, transaction?: Transaction): Promise<ServiceEvent>;
    cleanup(transaction?: Transaction): Promise<void>;
    resetCounter(): void;
    private generateUUID;
}
export default ServiceEventFixtures;
//# sourceMappingURL=ServiceEventFixtures.d.ts.map