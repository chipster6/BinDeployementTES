"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEnvironmentResilience = exports.TestEnvironmentResilienceService = exports.TestEnvironmentType = exports.ServiceHealthStatus = exports.ServiceType = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("@/utils/logger");
var ServiceType;
(function (ServiceType) {
    ServiceType["DATABASE"] = "database";
    ServiceType["REDIS"] = "redis";
    ServiceType["EXTERNAL_API"] = "external_api";
    ServiceType["MESSAGE_QUEUE"] = "message_queue";
    ServiceType["FILE_STORAGE"] = "file_storage";
    ServiceType["EMAIL_SERVICE"] = "email_service";
    ServiceType["SMS_SERVICE"] = "sms_service";
    ServiceType["PAYMENT_SERVICE"] = "payment_service";
    ServiceType["MAPS_SERVICE"] = "maps_service";
    ServiceType["NOTIFICATION_SERVICE"] = "notification_service";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var ServiceHealthStatus;
(function (ServiceHealthStatus) {
    ServiceHealthStatus["HEALTHY"] = "healthy";
    ServiceHealthStatus["DEGRADED"] = "degraded";
    ServiceHealthStatus["UNHEALTHY"] = "unhealthy";
    ServiceHealthStatus["OFFLINE"] = "offline";
    ServiceHealthStatus["UNKNOWN"] = "unknown";
})(ServiceHealthStatus || (exports.ServiceHealthStatus = ServiceHealthStatus = {}));
var TestEnvironmentType;
(function (TestEnvironmentType) {
    TestEnvironmentType["LOCAL"] = "local";
    TestEnvironmentType["DOCKER"] = "docker";
    TestEnvironmentType["KUBERNETES"] = "kubernetes";
    TestEnvironmentType["CLOUD"] = "cloud";
    TestEnvironmentType["HYBRID"] = "hybrid";
})(TestEnvironmentType || (exports.TestEnvironmentType = TestEnvironmentType = {}));
class TestEnvironmentResilienceService extends events_1.EventEmitter {
    constructor() {
        super();
        this.environmentConfig = null;
        this.serviceDependencies = new Map();
        this.serviceHealthChecks = new Map();
        this.circuitBreakers = new Map();
        this.activeFallbacks = new Map();
        this.mockServices = new Map();
        this.healthCheckInterval = null;
        this.environmentStartTime = new Date();
        this.httpClient = this.createHttpClient();
        this.resilienceMetrics = this.initializeMetrics();
        this.initializeDefaultServices();
    }
    async initializeEnvironment(environmentName, config) {
        logger_1.logger.info('Initializing resilient test environment', {
            environment: environmentName,
        });
        try {
            this.environmentConfig = await this.loadEnvironmentConfiguration(environmentName, config);
            await this.setupServiceDependencies();
            this.startHealthChecking();
            await this.initializeFallbackStrategies();
            await this.runEnvironmentSetup();
            await this.verifyEnvironmentReadiness();
            this.emit('environmentInitialized', {
                environment: environmentName,
                config: this.environmentConfig,
                timestamp: new Date(),
            });
            logger_1.logger.info('Test environment initialized successfully', {
                environment: environmentName,
                services: this.serviceDependencies.size,
                fallbacks: this.activeFallbacks.size,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize test environment', {
                environment: environmentName,
                error: error.message,
            });
            await this.attemptEnvironmentRecovery(error);
            throw error;
        }
    }
    async checkServiceHealth(serviceName) {
        const service = this.serviceDependencies.get(serviceName);
        if (!service) {
            throw new Error(`Unknown service: ${serviceName}`);
        }
        const startTime = Date.now();
        let status = ServiceHealthStatus.UNKNOWN;
        let error;
        const metadata = {};
        try {
            const circuitBreaker = this.circuitBreakers.get(serviceName);
            if (circuitBreaker && circuitBreaker.isOpen()) {
                status = ServiceHealthStatus.OFFLINE;
                error = 'Circuit breaker is open';
                metadata.circuitBreakerOpen = true;
            }
            else {
                const response = await this.httpClient.get(service.healthCheckUrl, {
                    timeout: service.timeout,
                });
                status = ServiceHealthStatus.HEALTHY;
                metadata.statusCode = response.status;
                metadata.responseData = response.data;
            }
        }
        catch (err) {
            error = err.message;
            status = this.categorizeHealthError(err);
            const circuitBreaker = this.circuitBreakers.get(serviceName);
            if (circuitBreaker) {
                circuitBreaker.recordFailure();
            }
        }
        const responseTime = Date.now() - startTime;
        const healthCheck = {
            serviceName,
            status,
            responseTime,
            lastCheck: new Date(),
            error,
            metadata,
        };
        this.serviceHealthChecks.set(serviceName, healthCheck);
        if (status === ServiceHealthStatus.UNHEALTHY || status === ServiceHealthStatus.OFFLINE) {
            await this.handleServiceFailure(serviceName, healthCheck);
        }
        this.emit('serviceHealthChecked', healthCheck);
        return healthCheck;
    }
    async executeWithResilience(testFunction, options = {}) {
        const { requiredServices = [], fallbackStrategy = 'degrade-gracefully', timeout = 300000, retryAttempts = 2, } = options;
        await this.verifyRequiredServices(requiredServices, fallbackStrategy);
        let lastError = null;
        let attempt = 0;
        while (attempt <= retryAttempts) {
            try {
                const monitor = this.setupExecutionMonitoring(requiredServices);
                const result = await this.executeWithTimeout(testFunction, timeout);
                this.cleanupExecutionMonitoring(monitor);
                return result;
            }
            catch (error) {
                lastError = error;
                attempt++;
                logger_1.logger.warn('Test execution failed, analyzing for environment issues', {
                    attempt,
                    error: error.message,
                    requiredServices,
                });
                const isEnvironmentError = await this.analyzeErrorForEnvironmentIssues(error, requiredServices);
                if (isEnvironmentError && attempt <= retryAttempts) {
                    const recovered = await this.attemptServiceRecovery(requiredServices, error);
                    if (recovered) {
                        logger_1.logger.info('Environment recovery successful, retrying test', {
                            attempt,
                        });
                        await this.delay(2000 * attempt);
                        continue;
                    }
                }
                if (attempt > retryAttempts) {
                    break;
                }
            }
        }
        throw lastError;
    }
    async switchToFallbackEnvironment(fallbackName, reason) {
        logger_1.logger.info('Switching to fallback environment', {
            fallback: fallbackName,
            reason,
            currentEnvironment: this.environmentConfig?.name,
        });
        try {
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
            }
            if (this.environmentConfig) {
                await this.teardownEnvironment();
            }
            await this.initializeEnvironment(fallbackName);
            this.resilienceMetrics.environmentSwitches++;
            this.emit('environmentSwitched', {
                from: this.environmentConfig?.name,
                to: fallbackName,
                reason,
                timestamp: new Date(),
            });
            logger_1.logger.info('Successfully switched to fallback environment', {
                fallback: fallbackName,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to switch to fallback environment', {
                fallback: fallbackName,
                error: error.message,
            });
            throw error;
        }
    }
    getResilienceStatus() {
        const services = Array.from(this.serviceHealthChecks.values());
        const healthyServices = services.filter(s => s.status === ServiceHealthStatus.HEALTHY);
        const degradedServices = services.filter(s => s.status === ServiceHealthStatus.DEGRADED);
        const offlineServices = services.filter(s => s.status === ServiceHealthStatus.OFFLINE);
        let status = 'healthy';
        const recommendations = [];
        if (offlineServices.length > 0) {
            if (offlineServices.some(s => this.serviceDependencies.get(s.serviceName)?.required)) {
                status = 'critical';
                recommendations.push('Critical services are offline - consider switching to fallback environment');
            }
            else {
                status = 'degraded';
                recommendations.push('Non-critical services are offline - monitor test execution closely');
            }
        }
        else if (degradedServices.length > 2) {
            status = 'degraded';
            recommendations.push('Multiple services showing degraded performance');
        }
        if (this.activeFallbacks.size > 3) {
            recommendations.push('Many services running on fallbacks - investigate root causes');
        }
        return {
            environment: this.environmentConfig?.name || 'unknown',
            status,
            metrics: this.updateAndGetMetrics(),
            services,
            recommendations,
        };
    }
    async teardownEnvironment() {
        logger_1.logger.info('Tearing down test environment');
        try {
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }
            await this.cleanupFallbacks();
            if (this.environmentConfig?.teardownCommands) {
                for (const command of this.environmentConfig.teardownCommands) {
                    try {
                        (0, child_process_1.execSync)(command, { timeout: 30000 });
                    }
                    catch (error) {
                        logger_1.logger.warn('Teardown command failed', {
                            command,
                            error: error.message,
                        });
                    }
                }
            }
            this.serviceDependencies.clear();
            this.serviceHealthChecks.clear();
            this.circuitBreakers.clear();
            this.activeFallbacks.clear();
            this.mockServices.clear();
            this.emit('environmentTornDown', {
                environment: this.environmentConfig?.name,
                timestamp: new Date(),
            });
            logger_1.logger.info('Test environment teardown completed');
        }
        catch (error) {
            logger_1.logger.error('Environment teardown failed', {
                error: error.message,
            });
        }
    }
    async loadEnvironmentConfiguration(environmentName, configOverride) {
        const configPath = `./tests/config/environments/${environmentName}.json`;
        let config;
        try {
            const configContent = await fs_1.promises.readFile(configPath, 'utf8');
            config = JSON.parse(configContent);
        }
        catch (error) {
            config = this.getDefaultEnvironmentConfiguration(environmentName);
        }
        if (configOverride) {
            config = { ...config, ...configOverride };
        }
        return config;
    }
    getDefaultEnvironmentConfiguration(environmentName) {
        return {
            name: environmentName,
            type: TestEnvironmentType.LOCAL,
            services: [
                {
                    name: 'database',
                    type: ServiceType.DATABASE,
                    required: true,
                    healthCheckUrl: 'http://localhost:5432',
                    timeout: 5000,
                    retryAttempts: 3,
                    circuitBreakerThreshold: 5,
                    fallbackStrategy: {
                        type: 'mock',
                        priority: 1,
                        configuration: {
                            mockImplementation: 'in-memory-database',
                        },
                    },
                    environment: {
                        DB_HOST: 'localhost',
                        DB_PORT: '5432',
                    },
                },
                {
                    name: 'redis',
                    type: ServiceType.REDIS,
                    required: false,
                    healthCheckUrl: 'http://localhost:6379',
                    timeout: 3000,
                    retryAttempts: 2,
                    circuitBreakerThreshold: 3,
                    fallbackStrategy: {
                        type: 'mock',
                        priority: 1,
                        configuration: {
                            mockImplementation: 'memory-cache',
                        },
                    },
                    environment: {
                        REDIS_HOST: 'localhost',
                        REDIS_PORT: '6379',
                    },
                },
            ],
            resources: {
                memory: '2GB',
                cpu: '2 cores',
                storage: '10GB',
            },
            networks: ['test-network'],
            volumes: ['test-data'],
            environmentVariables: {
                NODE_ENV: 'test',
                LOG_LEVEL: 'debug',
            },
            setupCommands: [],
            teardownCommands: [],
        };
    }
    initializeDefaultServices() {
        this.initializeDefaultMockServices();
    }
    initializeDefaultMockServices() {
        this.mockServices.set('database', {
            type: ServiceType.DATABASE,
            implementation: 'mock-database',
            healthCheck: () => Promise.resolve(true),
            cleanup: () => Promise.resolve(),
        });
        this.mockServices.set('redis', {
            type: ServiceType.REDIS,
            implementation: 'memory-cache',
            healthCheck: () => Promise.resolve(true),
            cleanup: () => Promise.resolve(),
        });
        this.mockServices.set('external-api', {
            type: ServiceType.EXTERNAL_API,
            implementation: 'mock-server',
            healthCheck: () => Promise.resolve(true),
            cleanup: () => Promise.resolve(),
        });
    }
    async setupServiceDependencies() {
        if (!this.environmentConfig)
            return;
        for (const service of this.environmentConfig.services) {
            this.serviceDependencies.set(service.name, service);
            const circuitBreaker = new CircuitBreaker(service.circuitBreakerThreshold, 60000, 30000);
            this.circuitBreakers.set(service.name, circuitBreaker);
            logger_1.logger.debug('Service dependency configured', {
                name: service.name,
                type: service.type,
                required: service.required,
            });
        }
    }
    startHealthChecking() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthChecks();
            }
            catch (error) {
                logger_1.logger.error('Health check cycle failed', {
                    error: error.message,
                });
            }
        }, 30000);
    }
    async performHealthChecks() {
        const healthCheckPromises = Array.from(this.serviceDependencies.keys())
            .map(serviceName => this.checkServiceHealth(serviceName));
        await Promise.allSettled(healthCheckPromises);
        this.updateResilienceMetrics();
    }
    async initializeFallbackStrategies() {
        for (const [serviceName, service] of this.serviceDependencies) {
            if (service.fallbackStrategy) {
                try {
                    await this.initializeFallback(serviceName, service.fallbackStrategy);
                }
                catch (error) {
                    logger_1.logger.warn('Failed to initialize fallback strategy', {
                        service: serviceName,
                        error: error.message,
                    });
                }
            }
        }
    }
    async initializeFallback(serviceName, strategy) {
        switch (strategy.type) {
            case 'mock':
                await this.initializeMockFallback(serviceName, strategy);
                break;
            case 'proxy':
                await this.initializeProxyFallback(serviceName, strategy);
                break;
            case 'cache':
                await this.initializeCacheFallback(serviceName, strategy);
                break;
        }
    }
    async initializeMockFallback(serviceName, strategy) {
        const mockService = this.mockServices.get(serviceName);
        if (mockService) {
            logger_1.logger.debug('Mock fallback initialized', { service: serviceName });
        }
        else {
            logger_1.logger.warn('Mock service not available for fallback', { service: serviceName });
        }
    }
    async initializeProxyFallback(serviceName, strategy) {
        logger_1.logger.debug('Proxy fallback initialized', { service: serviceName });
    }
    async initializeCacheFallback(serviceName, strategy) {
        logger_1.logger.debug('Cache fallback initialized', { service: serviceName });
    }
    async runEnvironmentSetup() {
        if (!this.environmentConfig?.setupCommands)
            return;
        for (const command of this.environmentConfig.setupCommands) {
            try {
                (0, child_process_1.execSync)(command, { timeout: 60000 });
                logger_1.logger.debug('Setup command executed', { command });
            }
            catch (error) {
                logger_1.logger.error('Setup command failed', {
                    command,
                    error: error.message,
                });
                throw error;
            }
        }
    }
    async verifyEnvironmentReadiness() {
        const requiredServices = Array.from(this.serviceDependencies.values())
            .filter(service => service.required);
        for (const service of requiredServices) {
            const healthCheck = await this.checkServiceHealth(service.name);
            if (healthCheck.status === ServiceHealthStatus.OFFLINE) {
                throw new Error(`Required service ${service.name} is not available and fallback failed`);
            }
        }
    }
    async handleServiceFailure(serviceName, healthCheck) {
        const service = this.serviceDependencies.get(serviceName);
        if (!service)
            return;
        logger_1.logger.warn('Service failure detected, attempting fallback', {
            service: serviceName,
            status: healthCheck.status,
            error: healthCheck.error,
        });
        if (this.activeFallbacks.has(serviceName)) {
            logger_1.logger.debug('Fallback already active for service', { service: serviceName });
            return;
        }
        try {
            await this.activateFallback(serviceName, service.fallbackStrategy);
            this.activeFallbacks.set(serviceName, service.fallbackStrategy);
            this.emit('fallbackActivated', {
                service: serviceName,
                strategy: service.fallbackStrategy.type,
                timestamp: new Date(),
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to activate fallback', {
                service: serviceName,
                error: error.message,
            });
            if (service.required) {
                throw new Error(`Critical service ${serviceName} failed and fallback activation failed: ${error.message}`);
            }
        }
    }
    async activateFallback(serviceName, strategy) {
        switch (strategy.type) {
            case 'mock':
                await this.activateMockFallback(serviceName, strategy);
                break;
            case 'proxy':
                await this.activateProxyFallback(serviceName, strategy);
                break;
            case 'cache':
                await this.activateCacheFallback(serviceName, strategy);
                break;
            case 'disable':
                await this.disableService(serviceName);
                break;
        }
    }
    async activateMockFallback(serviceName, strategy) {
        const mockService = this.mockServices.get(serviceName);
        if (mockService && mockService.healthCheck) {
            const healthy = await mockService.healthCheck();
            if (!healthy) {
                throw new Error(`Mock service for ${serviceName} is not healthy`);
            }
        }
        logger_1.logger.info('Mock fallback activated', { service: serviceName });
    }
    async activateProxyFallback(serviceName, strategy) {
        logger_1.logger.info('Proxy fallback activated', { service: serviceName });
    }
    async activateCacheFallback(serviceName, strategy) {
        logger_1.logger.info('Cache fallback activated', { service: serviceName });
    }
    async disableService(serviceName) {
        logger_1.logger.info('Service disabled as fallback strategy', { service: serviceName });
    }
    async verifyRequiredServices(requiredServices, fallbackStrategy) {
        for (const serviceName of requiredServices) {
            const healthCheck = this.serviceHealthChecks.get(serviceName);
            if (!healthCheck || healthCheck.status === ServiceHealthStatus.OFFLINE) {
                if (fallbackStrategy === 'fail-fast') {
                    throw new Error(`Required service ${serviceName} is not available`);
                }
                else if (fallbackStrategy === 'mock-services') {
                    await this.ensureMockFallback(serviceName);
                }
            }
        }
    }
    async ensureMockFallback(serviceName) {
        const service = this.serviceDependencies.get(serviceName);
        if (service && !this.activeFallbacks.has(serviceName)) {
            await this.activateFallback(serviceName, service.fallbackStrategy);
            this.activeFallbacks.set(serviceName, service.fallbackStrategy);
        }
    }
    setupExecutionMonitoring(requiredServices) {
        const startTime = Date.now();
        const startMemory = process.memoryUsage();
        const monitor = {
            startTime,
            startMemory,
            requiredServices,
            interval: setInterval(() => {
                const currentMemory = process.memoryUsage();
                const memoryDelta = currentMemory.heapUsed - startMemory.heapUsed;
                if (memoryDelta > 512 * 1024 * 1024) {
                    logger_1.logger.warn('High memory usage during test execution', {
                        memoryDelta: Math.round(memoryDelta / (1024 * 1024)) + 'MB',
                    });
                }
            }, 10000),
        };
        return monitor;
    }
    cleanupExecutionMonitoring(monitor) {
        if (monitor.interval) {
            clearInterval(monitor.interval);
        }
    }
    async analyzeErrorForEnvironmentIssues(error, requiredServices) {
        const message = error.message.toLowerCase();
        const environmentErrorPatterns = [
            'connection refused',
            'timeout',
            'network',
            'enotfound',
            'econnreset',
            'database',
            'redis',
            'service unavailable',
        ];
        const isEnvironmentError = environmentErrorPatterns.some(pattern => message.includes(pattern));
        if (isEnvironmentError) {
            logger_1.logger.debug('Error identified as environment-related', {
                error: error.message,
                requiredServices,
            });
        }
        return isEnvironmentError;
    }
    async attemptEnvironmentRecovery(error) {
        logger_1.logger.info('Attempting environment recovery', {
            error: error.message,
        });
        try {
            for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
                if (circuitBreaker.isOpen()) {
                    circuitBreaker.reset();
                    logger_1.logger.debug('Circuit breaker reset', { service: serviceName });
                }
            }
            await this.performHealthChecks();
            const offlineServices = Array.from(this.serviceHealthChecks.values())
                .filter(check => check.status === ServiceHealthStatus.OFFLINE);
            for (const check of offlineServices) {
                await this.attemptServiceRestart(check.serviceName);
            }
        }
        catch (recoveryError) {
            logger_1.logger.error('Environment recovery failed', {
                error: recoveryError.message,
            });
        }
    }
    async attemptServiceRecovery(requiredServices, error) {
        let recoveredAny = false;
        for (const serviceName of requiredServices) {
            try {
                const recovered = await this.attemptServiceRestart(serviceName);
                if (recovered) {
                    recoveredAny = true;
                }
            }
            catch (serviceError) {
                logger_1.logger.warn('Service recovery failed', {
                    service: serviceName,
                    error: serviceError.message,
                });
            }
        }
        return recoveredAny;
    }
    async attemptServiceRestart(serviceName) {
        const service = this.serviceDependencies.get(serviceName);
        if (!service)
            return false;
        logger_1.logger.info('Attempting service restart', { service: serviceName });
        try {
            if (this.activeFallbacks.has(serviceName)) {
                await this.deactivateFallback(serviceName);
            }
            await this.delay(5000);
            const healthCheck = await this.checkServiceHealth(serviceName);
            if (healthCheck.status === ServiceHealthStatus.HEALTHY) {
                logger_1.logger.info('Service restart successful', { service: serviceName });
                return true;
            }
            else {
                await this.activateFallback(serviceName, service.fallbackStrategy);
                this.activeFallbacks.set(serviceName, service.fallbackStrategy);
                return false;
            }
        }
        catch (error) {
            logger_1.logger.error('Service restart failed', {
                service: serviceName,
                error: error.message,
            });
            return false;
        }
    }
    async deactivateFallback(serviceName) {
        const strategy = this.activeFallbacks.get(serviceName);
        if (!strategy)
            return;
        if (strategy.cleanup) {
            await strategy.cleanup();
        }
        this.activeFallbacks.delete(serviceName);
        logger_1.logger.debug('Fallback deactivated', { service: serviceName });
    }
    async cleanupFallbacks() {
        const cleanupPromises = Array.from(this.activeFallbacks.keys())
            .map(serviceName => this.deactivateFallback(serviceName));
        await Promise.allSettled(cleanupPromises);
    }
    categorizeHealthError(error) {
        const message = error.message.toLowerCase();
        if (message.includes('timeout')) {
            return ServiceHealthStatus.DEGRADED;
        }
        if (message.includes('connection refused') || message.includes('econnrefused')) {
            return ServiceHealthStatus.OFFLINE;
        }
        if (message.includes('404') || message.includes('not found')) {
            return ServiceHealthStatus.UNHEALTHY;
        }
        return ServiceHealthStatus.UNHEALTHY;
    }
    createHttpClient() {
        return axios_1.default.create({
            timeout: 10000,
            maxRedirects: 3,
            validateStatus: (status) => status >= 200 && status < 300,
        });
    }
    initializeMetrics() {
        return {
            totalServices: 0,
            healthyServices: 0,
            degradedServices: 0,
            offlineServices: 0,
            activeFallbacks: 0,
            averageResponseTime: 0,
            uptime: 0,
            circuitBreakerTrips: 0,
            environmentSwitches: 0,
            lastHealthCheck: new Date(),
        };
    }
    updateResilienceMetrics() {
        const services = Array.from(this.serviceHealthChecks.values());
        this.resilienceMetrics.totalServices = services.length;
        this.resilienceMetrics.healthyServices = services.filter(s => s.status === ServiceHealthStatus.HEALTHY).length;
        this.resilienceMetrics.degradedServices = services.filter(s => s.status === ServiceHealthStatus.DEGRADED).length;
        this.resilienceMetrics.offlineServices = services.filter(s => s.status === ServiceHealthStatus.OFFLINE).length;
        this.resilienceMetrics.activeFallbacks = this.activeFallbacks.size;
        const validResponseTimes = services
            .map(s => s.responseTime)
            .filter(time => time > 0);
        this.resilienceMetrics.averageResponseTime = validResponseTimes.length > 0
            ? validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length
            : 0;
        this.resilienceMetrics.uptime = Date.now() - this.environmentStartTime.getTime();
        this.resilienceMetrics.lastHealthCheck = new Date();
        this.resilienceMetrics.circuitBreakerTrips = Array.from(this.circuitBreakers.values())
            .reduce((sum, cb) => sum + cb.getFailureCount(), 0);
    }
    updateAndGetMetrics() {
        this.updateResilienceMetrics();
        return { ...this.resilienceMetrics };
    }
    async executeWithTimeout(operation, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Operation timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            operation()
                .then(resolve)
                .catch(reject)
                .finally(() => clearTimeout(timer));
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.TestEnvironmentResilienceService = TestEnvironmentResilienceService;
class CircuitBreaker {
    constructor(failureThreshold, resetTimeoutMs, openTimeoutMs) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
        this.openTimeoutMs = openTimeoutMs;
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.state = 'closed';
    }
    isOpen() {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.openTimeoutMs) {
                this.state = 'half-open';
                return false;
            }
            return true;
        }
        return false;
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'open';
        }
    }
    recordSuccess() {
        this.failureCount = 0;
        this.state = 'closed';
    }
    reset() {
        this.failureCount = 0;
        this.state = 'closed';
    }
    getFailureCount() {
        return this.failureCount;
    }
}
exports.testEnvironmentResilience = new TestEnvironmentResilienceService();
exports.default = TestEnvironmentResilienceService;
//# sourceMappingURL=TestEnvironmentResilience.js.map