declare function globalSetup(): Promise<void>;
export default globalSetup;
declare global {
    namespace globalThis {
        var mockServices: {
            payment: {
                baseUrl: string;
                enabled: boolean;
            };
            sms: {
                baseUrl: string;
                enabled: boolean;
            };
            email: {
                baseUrl: string;
                enabled: boolean;
            };
            maps: {
                baseUrl: string;
                enabled: boolean;
            };
        };
    }
}
//# sourceMappingURL=globalSetup.d.ts.map