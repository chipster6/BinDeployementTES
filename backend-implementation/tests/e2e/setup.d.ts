import { Express } from 'express';
import { Server } from 'http';
export declare function getTestApp(): Express;
export declare function getTestServer(): Server;
export declare function waitForOperation(operation: () => Promise<boolean>, timeout?: number, interval?: number): Promise<void>;
export declare function simulateNetworkDelay(ms?: number): Promise<void>;
declare const _default: {
    getTestApp: typeof getTestApp;
    getTestServer: typeof getTestServer;
    waitForOperation: typeof waitForOperation;
    simulateNetworkDelay: typeof simulateNetworkDelay;
};
export default _default;
//# sourceMappingURL=setup.d.ts.map