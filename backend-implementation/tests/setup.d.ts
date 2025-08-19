import 'reflect-metadata';
export declare const testConfig: {
    database: {
        host: string;
        port: number;
        database: string;
        username: string;
        password: string;
        dialect: "postgres";
        logging: boolean;
        pool: {
            min: number;
            max: number;
            idle: number;
            acquire: number;
        };
    };
    redis: {
        host: string;
        port: number;
        password: string;
        db: number;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    encryption: {
        algorithm: string;
        key: string;
    };
};
declare global {
    namespace globalThis {
        var testUtils: {
            delay: (ms: number) => Promise<void>;
            generateRandomString: (length?: number) => string;
            generateRandomEmail: () => string;
            generateRandomPhone: () => string;
            createMockDate: (dateString?: string) => Date;
        };
    }
}
export default testConfig;
//# sourceMappingURL=setup.d.ts.map