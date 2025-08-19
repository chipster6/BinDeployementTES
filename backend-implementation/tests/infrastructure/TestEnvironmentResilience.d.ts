import { EventEmitter } from 'events';
export declare enum ServiceType {
    DATABASE = "database",
    REDIS = "redis",
    EXTERNAL_API = "external_api",
    MESSAGE_QUEUE = "message_queue",
    FILE_STORAGE = "file_storage",
    EMAIL_SERVICE = "email_service",
    SMS_SERVICE = "sms_service",
    PAYMENT_SERVICE = "payment_service",
    MAPS_SERVICE = "maps_service",
    NOTIFICATION_SERVICE = "notification_service"
}
export declare enum ServiceHealthStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy",
    OFFLINE = "offline",
    UNKNOWN = "unknown"
}
export declare enum TestEnvironmentType {
    LOCAL = "local",
    DOCKER = "docker",
    KUBERNETES = "kubernetes",
    CLOUD = "cloud",
    HYBRID = "hybrid"
}
export interface ServiceDependency {
    name: string;
    type: ServiceType;
    required: boolean;
    healthCheckUrl: string;
    mockService?: {
        enabled: boolean;
        implementation: string;
        baseUrl?: string;
    };
    timeout: number;
    retryAttempts: number;
    circuitBreakerThreshold: number;
    fallbackStrategy: FallbackStrategy;
    environment: Record<string, string>;
}
export interface FallbackStrategy {
    type: 'mock' | 'proxy' | 'cache' | 'disable';
    priority: number;
    configuration: Record<string, any>;
    healthCheck?: () => Promise<boolean>;
    cleanup?: () => Promise<void>;
}
export interface EnvironmentConfiguration {
    name: string;
    type: TestEnvironmentType;
    services: ServiceDependency[];
    resources: {
        memory: string;
        cpu: string;
        storage: string;
    };
    networks: string[];
    volumes: string[];
    environmentVariables: Record<string, string>;
    setupCommands: string[];
    teardownCommands: string[];
}
export interface ServiceHealthCheck {
    serviceName: string;
    status: ServiceHealthStatus;
    responseTime: number;
    lastCheck: Date;
    error?: string;
    metadata: Record<string, any>;
}
export interface ResilienceMetrics {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    offlineServices: number;
    activeFallbacks: number;
    averageResponseTime: number;
    uptime: number;
    circuitBreakerTrips: number;
    environmentSwitches: number;
    lastHealthCheck: Date;
}
export declare class TestEnvironmentResilienceService extends EventEmitter {
    private environmentConfig;
    private serviceDependencies;
    private serviceHealthChecks;
    private circuitBreakers;
    private activeFallbacks;
    private mockServices;
    private httpClient;
    private healthCheckInterval;
    private resilienceMetrics;
    private environmentStartTime;
    constructor();
    initializeEnvironment(environmentName: string, config?: Partial<EnvironmentConfiguration>): Promise<void>;
    checkServiceHealth(serviceName: string): Promise<ServiceHealthCheck>;
    executeWithResilience<T>(testFunction: () => Promise<T>, options?: {
        requiredServices?: string[];
        fallbackStrategy?: 'fail-fast' | 'degrade-gracefully' | 'mock-services';
        timeout?: number;
        retryAttempts?: number;
    }): Promise<T>;
    switchToFallbackEnvironment(fallbackName: string, reason: string): Promise<void>;
    getResilienceStatus(): {
        environment: string;
        status: 'healthy' | 'degraded' | 'critical';
        metrics: ResilienceMetrics;
        services: ServiceHealthCheck[];
        recommendations: string[];
    };
    teardownEnvironment(): Promise<void>;
    private loadEnvironmentConfiguration;
    private getDefaultEnvironmentConfiguration;
    private initializeDefaultServices;
    private initializeDefaultMockServices;
    private setupServiceDependencies;
    private startHealthChecking;
    private performHealthChecks;
    private initializeFallbackStrategies;
    private initializeFallback;
    private initializeMockFallback;
    private initializeProxyFallback;
    private initializeCacheFallback;
    private runEnvironmentSetup;
    private verifyEnvironmentReadiness;
    private handleServiceFailure;
    private activateFallback;
    private activateMockFallback;
    private activateProxyFallback;
    private activateCacheFallback;
    private disableService;
    private verifyRequiredServices;
    private ensureMockFallback;
    private setupExecutionMonitoring;
    private cleanupExecutionMonitoring;
    private analyzeErrorForEnvironmentIssues;
    private attemptEnvironmentRecovery;
    private attemptServiceRecovery;
    private attemptServiceRestart;
    private deactivateFallback;
    private cleanupFallbacks;
    private categorizeHealthError;
    private createHttpClient;
    private initializeMetrics;
    private updateResilienceMetrics;
    private updateAndGetMetrics;
    private executeWithTimeout;
    private delay;
}
export declare const testEnvironmentResilience: TestEnvironmentResilienceService;
export default TestEnvironmentResilienceService;
//# sourceMappingURL=TestEnvironmentResilience.d.ts.map