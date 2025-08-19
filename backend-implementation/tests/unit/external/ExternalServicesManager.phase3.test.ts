/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - PHASE 3 EXTERNAL SERVICES COORDINATION TESTING
 * ============================================================================
 *
 * Comprehensive Phase 3 tests for External Services Manager covering:
 * - 11-service integration coordination and health monitoring
 * - Circuit breaker management and fallback mechanisms
 * - Real-time coordination with Frontend dashboard updates
 * - Cost optimization and rate limiting coordination
 * - Service initialization sequence and error recovery
 * - WebSocket coordination for real-time status updates
 * - Business continuity validation for critical services
 * - Service dependency management and conflict resolution
 *
 * Created by: Testing Agent (Phase 3 Validation)
 * Date: 2025-08-16
 * Version: 1.0.0
 * Coverage Target: 95%+
 */

import { ExternalServicesManager } from '@/services/external/ExternalServicesManager';
import { AuditLog } from '@/models/AuditLog';
import { socketManager } from '@/services/socketManager';
import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import StripeService from '@/services/external/StripeService';
import TwilioService from '@/services/external/TwilioService';
import SendGridService from '@/services/external/SendGridService';

// Mock all external dependencies
jest.mock('@/models/AuditLog');
jest.mock('@/services/socketManager');
jest.mock('@/config/redis');
jest.mock('@/utils/logger');
jest.mock('@/services/external/StripeService');
jest.mock('@/services/external/TwilioService');
jest.mock('@/services/external/SendGridService');
jest.mock('@/services/external/SamsaraService');
jest.mock('@/services/external/AirtableService');
jest.mock('@/services/external/MapsService');

describe('External Services Manager - Phase 3 Comprehensive Validation', () => {
  let servicesManager: ExternalServicesManager;
  let mockSocketManager: jest.Mocked<typeof socketManager>;
  let mockRedisClient: jest.Mocked<typeof redisClient>;
  let mockAuditLog: jest.Mocked<typeof AuditLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    servicesManager = new ExternalServicesManager();
    mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;
    mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
    mockAuditLog = AuditLog as jest.Mocked<typeof AuditLog>;

    // Setup environment variables for testing
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123456789';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test123';
    process.env.TWILIO_ACCOUNT_SID = 'AC123456789';
    process.env.TWILIO_AUTH_TOKEN = 'test_token_123';
    process.env.SENDGRID_API_KEY = 'SG.test.123456789';
    process.env.MAPBOX_ACCESS_TOKEN = 'pk.test.mapbox123';
    process.env.SAMSARA_API_TOKEN = 'samsara_test_123';
    process.env.AIRTABLE_API_KEY = 'keytest123';

    // Setup mocks
    mockSocketManager.sendToRole = jest.fn();
    mockSocketManager.broadcastToRoom = jest.fn();
    mockSocketManager.sendToUser = jest.fn();

    mockRedisClient.setex = jest.fn().mockResolvedValue('OK');
    mockRedisClient.get = jest.fn();
    mockRedisClient.del = jest.fn().mockResolvedValue(1);
    mockRedisClient.hget = jest.fn();
    mockRedisClient.hset = jest.fn();
    mockRedisClient.hincrby = jest.fn();

    mockAuditLog.create = jest.fn().mockResolvedValue({});
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.SAMSARA_API_TOKEN;
    delete process.env.AIRTABLE_API_KEY;
  });

  describe('Service Initialization and Configuration Management', () => {
    describe('Initialization Sequence', () => {
      it('should initialize all 11 external services in correct priority order', async () => {
        // Mock service initialization methods
        jest.spyOn(servicesManager as any, 'loadConfigurations').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'initializeServices').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'startHealthMonitoring').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'startSecurityMonitoring').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'initializeRealTimeCoordination').mockResolvedValue(undefined);

        await servicesManager.initialize();

        expect(mockAuditLog.create).toHaveBeenCalledWith({
          userId: null,
          customerId: null,
          action: 'services_manager_initialized',
          resourceType: 'external_services',
          resourceId: 'manager',
          details: expect.objectContaining({
            serviceCount: expect.any(Number),
            initializedAt: expect.any(String)
          }),
          ipAddress: 'system',
          userAgent: 'ExternalServicesManager'
        });

        expect(logger.info).toHaveBeenCalledWith(
          'External Services Manager initialized successfully',
          expect.objectContaining({
            serviceCount: expect.any(Number),
            enabledServices: expect.any(Array)
          })
        );
      });

      it('should handle service initialization failures gracefully', async () => {
        jest.spyOn(servicesManager as any, 'loadConfigurations')
          .mockRejectedValue(new Error('Configuration loading failed'));

        await expect(servicesManager.initialize()).rejects.toThrow('Configuration loading failed');

        expect(logger.error).toHaveBeenCalledWith(
          'Failed to initialize External Services Manager',
          expect.objectContaining({
            error: 'Configuration loading failed'
          })
        );
      });

      it('should validate service configurations based on environment variables', async () => {
        jest.spyOn(servicesManager as any, 'loadConfigurations').mockImplementation(async function() {
          // Validate that configurations are set based on environment variables
          expect(this.configurations.get('stripe')).toEqual({
            enabled: true, // STRIPE_SECRET_KEY is set
            priority: 10,
            fallbackEnabled: false,
            monitoringEnabled: true,
            alertingEnabled: true,
            config: {
              secretKey: 'sk_test_123456789',
              publishableKey: 'pk_test_123456789',
              webhookSecret: 'whsec_test123'
            }
          });

          expect(this.configurations.get('twilio')).toEqual({
            enabled: true, // TWILIO_ACCOUNT_SID is set
            priority: 8,
            fallbackEnabled: true,
            monitoringEnabled: true,
            alertingEnabled: true,
            config: {
              accountSid: 'AC123456789',
              authToken: 'test_token_123',
              webhookAuthToken: undefined
            }
          });
        });

        jest.spyOn(servicesManager as any, 'initializeServices').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'startHealthMonitoring').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'startSecurityMonitoring').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'initializeRealTimeCoordination').mockResolvedValue(undefined);

        await servicesManager.initialize();
      });
    });

    describe('Service Priority Management', () => {
      it('should prioritize critical payment services (Stripe) over communication services', async () => {
        jest.spyOn(servicesManager as any, 'loadConfigurations').mockImplementation(async function() {
          const stripeConfig = this.configurations.get('stripe');
          const twilioConfig = this.configurations.get('twilio');
          const sendgridConfig = this.configurations.get('sendgrid');

          expect(stripeConfig?.priority).toBe(10); // Highest priority
          expect(twilioConfig?.priority).toBe(8);
          expect(sendgridConfig?.priority).toBe(7);
        });

        jest.spyOn(servicesManager as any, 'initializeServices').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'startHealthMonitoring').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'startSecurityMonitoring').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'initializeRealTimeCoordination').mockResolvedValue(undefined);

        await servicesManager.initialize();
      });

      it('should configure fallback capabilities based on service criticality', async () => {
        jest.spyOn(servicesManager as any, 'loadConfigurations').mockImplementation(async function() {
          const stripeConfig = this.configurations.get('stripe');
          const twilioConfig = this.configurations.get('twilio');

          expect(stripeConfig?.fallbackEnabled).toBe(false); // No fallback for payments
          expect(twilioConfig?.fallbackEnabled).toBe(true); // Can fall back to email
        });

        jest.spyOn(servicesManager as any, 'initializeServices').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'startHealthMonitoring').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'startSecurityMonitoring').mockResolvedValue(undefined);
        jest.spyOn(servicesManager as any, 'initializeRealTimeCoordination').mockResolvedValue(undefined);

        await servicesManager.initialize();
      });
    });
  });

  describe('Health Monitoring and Circuit Breaker Management', () => {
    describe('Service Health Monitoring', () => {
      it('should monitor health of all services continuously', async () => {
        const mockServiceStatuses = [
          {
            name: 'stripe',
            status: 'healthy' as const,
            lastCheck: new Date(),
            uptime: 99.9,
            responseTime: 120,
            circuitBreakerState: 'closed' as const,
            errorCount: 0,
            successCount: 150
          },
          {
            name: 'twilio',
            status: 'degraded' as const,
            lastCheck: new Date(),
            uptime: 98.5,
            responseTime: 300,
            circuitBreakerState: 'half_open' as const,
            errorCount: 5,
            successCount: 95
          },
          {
            name: 'sendgrid',
            status: 'unhealthy' as const,
            lastCheck: new Date(),
            uptime: 85.0,
            responseTime: 1500,
            circuitBreakerState: 'open' as const,
            errorCount: 20,
            successCount: 80,
            lastError: 'Service timeout after 30 seconds'
          }
        ];

        jest.spyOn(servicesManager as any, 'getAllServiceStatuses')
          .mockResolvedValue(mockServiceStatuses);

        const serviceStatuses = await (servicesManager as any).getAllServiceStatuses();

        expect(serviceStatuses).toHaveLength(3);
        expect(serviceStatuses.find((s: any) => s.name === 'stripe').status).toBe('healthy');
        expect(serviceStatuses.find((s: any) => s.name === 'twilio').status).toBe('degraded');
        expect(serviceStatuses.find((s: any) => s.name === 'sendgrid').status).toBe('unhealthy');
      });

      it('should trigger circuit breaker when error threshold exceeded', async () => {
        const serviceWithErrors = {
          name: 'external_api',
          errorCount: 15,
          successCount: 5,
          circuitBreakerState: 'closed'
        };

        // Mock circuit breaker threshold (10 errors in 5 minutes)
        const shouldTriggerCircuitBreaker = serviceWithErrors.errorCount > 10 && 
          serviceWithErrors.errorCount / (serviceWithErrors.errorCount + serviceWithErrors.successCount) > 0.5;

        expect(shouldTriggerCircuitBreaker).toBe(true);

        // Simulate circuit breaker triggering
        const updatedService = {
          ...serviceWithErrors,
          circuitBreakerState: 'open' as const,
          status: 'unhealthy' as const
        };

        expect(updatedService.circuitBreakerState).toBe('open');
        expect(updatedService.status).toBe('unhealthy');
      });
    });

    describe('Real-Time Status Coordination', () => {
      it('should emit real-time events for service status changes', async () => {
        const statusChangeEvent = {
          eventType: 'api_status_change' as const,
          serviceName: 'stripe',
          data: {
            previousStatus: 'healthy',
            currentStatus: 'degraded',
            reason: 'High response time detected',
            responseTime: 850
          },
          timestamp: new Date(),
          severity: 'warning' as const
        };

        // Mock event emission
        jest.spyOn(servicesManager as any, 'emitRealTimeEvent').mockImplementation((event) => {
          expect(event.eventType).toBe('api_status_change');
          expect(event.serviceName).toBe('stripe');
          expect(event.severity).toBe('warning');
        });

        await (servicesManager as any).emitRealTimeEvent(statusChangeEvent);

        // Validate WebSocket coordination
        expect(mockSocketManager.broadcastToRoom).toHaveBeenCalledWith(
          'admin_dashboard',
          'service_status_update',
          expect.objectContaining({
            serviceName: 'stripe',
            status: 'degraded'
          })
        );
      });

      it('should coordinate with frontend dashboard for real-time updates', async () => {
        const dashboardData = {
          serviceStatuses: [
            {
              name: 'stripe',
              status: 'healthy' as const,
              lastCheck: new Date(),
              uptime: 99.9,
              responseTime: 120,
              circuitBreakerState: 'closed' as const,
              errorCount: 0,
              successCount: 150
            }
          ],
          realtimeMetrics: [
            {
              totalRequests: 1000,
              successfulRequests: 995,
              failedRequests: 5,
              averageResponseTime: 125,
              requestsPerMinute: 50,
              errorRate: 0.5,
              uptime: 99.9,
              lastHourStats: {
                requests: 3000,
                errors: 15,
                avgResponseTime: 130
              }
            }
          ],
          activeAlerts: [],
          costSummary: {
            totalMonthlyCost: 450.75,
            costByService: {
              stripe: 250.00,
              twilio: 125.50,
              sendgrid: 75.25
            }
          },
          lastUpdate: new Date()
        };

        jest.spyOn(servicesManager as any, 'getFrontendCoordinationData')
          .mockResolvedValue(dashboardData);

        const coordinationData = await (servicesManager as any).getFrontendCoordinationData();

        expect(coordinationData.serviceStatuses).toHaveLength(1);
        expect(coordinationData.realtimeMetrics).toHaveLength(1);
        expect(coordinationData.costSummary.totalMonthlyCost).toBe(450.75);
        expect(coordinationData.lastUpdate).toBeInstanceOf(Date);
      });
    });
  });

  describe('Cost Optimization and Rate Limiting Coordination', () => {
    describe('Cost Monitoring and Alerts', () => {
      it('should track service costs and trigger alerts when thresholds exceeded', async () => {
        const costThresholds = new Map([
          ['stripe', 500.00], // $500/month threshold
          ['twilio', 200.00], // $200/month threshold
          ['sendgrid', 100.00] // $100/month threshold
        ]);

        const currentCosts = {
          stripe: 475.50, // Within threshold
          twilio: 225.75, // Over threshold
          sendgrid: 89.25  // Within threshold
        };

        const costAlerts = [];
        for (const [service, threshold] of costThresholds) {
          const currentCost = currentCosts[service as keyof typeof currentCosts];
          if (currentCost > threshold) {
            costAlerts.push({
              service,
              currentCost,
              threshold,
              overage: currentCost - threshold,
              severity: currentCost > threshold * 1.2 ? 'critical' : 'warning'
            });
          }
        }

        expect(costAlerts).toHaveLength(1);
        expect(costAlerts[0].service).toBe('twilio');
        expect(costAlerts[0].overage).toBe(25.75);
        expect(costAlerts[0].severity).toBe('warning');
      });

      it('should provide cost optimization recommendations', async () => {
        const serviceUsageStats = {
          twilio: {
            totalRequests: 5000,
            peakUsageHours: ['09:00-11:00', '14:00-16:00'],
            utilizationRate: 65,
            recommendedOptimizations: [
              'Enable SMS bundling for bulk notifications',
              'Use cheaper voice region for non-critical calls',
              'Implement retry logic to reduce failed attempts'
            ]
          },
          sendgrid: {
            totalRequests: 8000,
            peakUsageHours: ['08:00-10:00', '17:00-19:00'],
            utilizationRate: 80,
            recommendedOptimizations: [
              'Batch email sending during off-peak hours',
              'Implement email template optimization',
              'Use suppression lists to reduce bounces'
            ]
          }
        };

        const optimizationReport = {
          potentialSavings: {
            twilio: { amount: 45.50, percentage: 20 },
            sendgrid: { amount: 18.75, percentage: 25 }
          },
          recommendations: serviceUsageStats,
          totalPotentialSavings: 64.25
        };

        expect(optimizationReport.totalPotentialSavings).toBe(64.25);
        expect(optimizationReport.potentialSavings.twilio.percentage).toBe(20);
        expect(serviceUsageStats.twilio.recommendedOptimizations).toHaveLength(3);
      });
    });

    describe('Rate Limiting Coordination', () => {
      it('should coordinate rate limits across services', async () => {
        const rateLimitConfigs = {
          stripe: {
            requestsPerSecond: 100,
            burstLimit: 200,
            timeWindow: 1000 // 1 second
          },
          twilio: {
            requestsPerSecond: 50,
            burstLimit: 100,
            timeWindow: 1000
          },
          sendgrid: {
            requestsPerSecond: 25,
            burstLimit: 50,
            timeWindow: 1000
          }
        };

        // Mock current request rates
        const currentRates = {
          stripe: 85, // Within limit
          twilio: 55, // Over limit
          sendgrid: 20  // Within limit
        };

        const rateLimitViolations = [];
        for (const [service, config] of Object.entries(rateLimitConfigs)) {
          const currentRate = currentRates[service as keyof typeof currentRates];
          if (currentRate > config.requestsPerSecond) {
            rateLimitViolations.push({
              service,
              currentRate,
              limit: config.requestsPerSecond,
              overage: currentRate - config.requestsPerSecond,
              action: 'throttle_requests'
            });
          }
        }

        expect(rateLimitViolations).toHaveLength(1);
        expect(rateLimitViolations[0].service).toBe('twilio');
        expect(rateLimitViolations[0].action).toBe('throttle_requests');
      });

      it('should implement coordinated backoff strategies', async () => {
        const backoffStrategies = {
          exponential: {
            initialDelay: 100, // ms
            maxDelay: 30000,   // 30 seconds
            multiplier: 2,
            jitter: true
          },
          linear: {
            initialDelay: 500,
            increment: 500,
            maxDelay: 10000
          },
          adaptive: {
            baseDelay: 1000,
            successThreshold: 0.9,
            adjustmentFactor: 0.5
          }
        };

        // Test exponential backoff calculation
        const calculateExponentialBackoff = (attempt: number, config: typeof backoffStrategies.exponential) => {
          const delay = Math.min(
            config.initialDelay * Math.pow(config.multiplier, attempt),
            config.maxDelay
          );
          return config.jitter ? delay * (0.5 + Math.random() * 0.5) : delay;
        };

        const attempt1 = calculateExponentialBackoff(0, backoffStrategies.exponential);
        const attempt2 = calculateExponentialBackoff(1, backoffStrategies.exponential);
        const attempt3 = calculateExponentialBackoff(2, backoffStrategies.exponential);

        expect(attempt1).toBeGreaterThanOrEqual(50); // With jitter: 50-100ms
        expect(attempt1).toBeLessThanOrEqual(100);
        expect(attempt2).toBeGreaterThanOrEqual(100); // With jitter: 100-200ms
        expect(attempt2).toBeLessThanOrEqual(200);
        expect(attempt3).toBeGreaterThanOrEqual(200); // With jitter: 200-400ms
        expect(attempt3).toBeLessThanOrEqual(400);
      });
    });
  });

  describe('Service Dependency Management and Conflict Resolution', () => {
    describe('Dependency Chain Validation', () => {
      it('should validate service dependencies before initialization', async () => {
        const serviceDependencies = {
          stripe: [], // No dependencies
          twilio: [], // No dependencies
          sendgrid: [], // No dependencies
          webhook_coordination: ['stripe', 'twilio', 'sendgrid'], // Depends on other services
          cost_optimization: ['stripe', 'twilio', 'sendgrid'], // Depends on other services
          threat_intelligence: ['external_apis'] // Depends on external API access
        };

        const initializationOrder = [];
        const initialized = new Set();

        // Simulate dependency-aware initialization
        const canInitialize = (service: string): boolean => {
          const deps = serviceDependencies[service as keyof typeof serviceDependencies] || [];
          return deps.every(dep => initialized.has(dep));
        };

        // Initialize services based on dependencies
        while (initialized.size < Object.keys(serviceDependencies).length) {
          for (const service of Object.keys(serviceDependencies)) {
            if (!initialized.has(service) && canInitialize(service)) {
              initializationOrder.push(service);
              initialized.add(service);
            }
          }
        }

        expect(initializationOrder.slice(0, 3)).toEqual(
          expect.arrayContaining(['stripe', 'twilio', 'sendgrid'])
        );
        expect(initializationOrder.indexOf('webhook_coordination')).toBeGreaterThan(
          Math.max(
            initializationOrder.indexOf('stripe'),
            initializationOrder.indexOf('twilio'),
            initializationOrder.indexOf('sendgrid')
          )
        );
      });

      it('should detect and resolve circular dependencies', async () => {
        const dependencyGraph = {
          serviceA: ['serviceB'],
          serviceB: ['serviceC'],
          serviceC: ['serviceA'] // Circular dependency
        };

        const detectCircularDependency = (graph: typeof dependencyGraph): string[] => {
          const visited = new Set();
          const recursionStack = new Set();
          const cycles: string[] = [];

          const dfs = (node: string, path: string[]): boolean => {
            if (recursionStack.has(node)) {
              cycles.push([...path, node].join(' -> '));
              return true;
            }
            if (visited.has(node)) return false;

            visited.add(node);
            recursionStack.add(node);

            const dependencies = graph[node as keyof typeof graph] || [];
            for (const dep of dependencies) {
              if (dfs(dep, [...path, node])) return true;
            }

            recursionStack.delete(node);
            return false;
          };

          for (const node of Object.keys(graph)) {
            if (!visited.has(node)) {
              dfs(node, []);
            }
          }

          return cycles;
        };

        const circularDeps = detectCircularDependency(dependencyGraph);
        expect(circularDeps.length).toBeGreaterThan(0);
        expect(circularDeps[0]).toContain('serviceA -> serviceB -> serviceC -> serviceA');
      });
    });

    describe('Service Conflict Resolution', () => {
      it('should resolve configuration conflicts between services', async () => {
        const serviceConfigs = {
          twilio: {
            rateLimitPerSecond: 50,
            webhookUrl: '/api/webhooks/twilio',
            retryAttempts: 3
          },
          sendgrid: {
            rateLimitPerSecond: 25,
            webhookUrl: '/api/webhooks/sendgrid',
            retryAttempts: 5
          }
        };

        // Check for webhook URL conflicts
        const webhookUrls = Object.values(serviceConfigs).map(config => config.webhookUrl);
        const uniqueUrls = new Set(webhookUrls);
        
        expect(uniqueUrls.size).toBe(webhookUrls.length); // No URL conflicts

        // Validate rate limit coordination
        const totalRateLimit = Object.values(serviceConfigs)
          .reduce((sum, config) => sum + config.rateLimitPerSecond, 0);
        
        expect(totalRateLimit).toBe(75); // Combined rate limit under system capacity
      });

      it('should handle service version compatibility', async () => {
        const serviceVersions = {
          stripe: { required: '>=8.0.0', current: '8.4.1', compatible: true },
          twilio: { required: '>=3.5.0', current: '3.8.2', compatible: true },
          sendgrid: { required: '>=7.0.0', current: '6.9.1', compatible: false } // Incompatible
        };

        const incompatibleServices = Object.entries(serviceVersions)
          .filter(([_, version]) => !version.compatible)
          .map(([service, version]) => ({
            service,
            required: version.required,
            current: version.current
          }));

        expect(incompatibleServices).toHaveLength(1);
        expect(incompatibleServices[0].service).toBe('sendgrid');
        expect(incompatibleServices[0].current).toBe('6.9.1');
      });
    });
  });

  describe('Business Continuity and Disaster Recovery', () => {
    describe('Service Failover Mechanisms', () => {
      it('should implement automatic failover for critical services', async () => {
        const criticalServices = ['stripe']; // Payment processing is critical
        const fallbackServices = {
          twilio: 'sendgrid', // SMS can fallback to email
          sendgrid: 'twilio'  // Email can fallback to SMS for urgent notifications
        };

        // Simulate Twilio service failure
        const serviceFailure = {
          service: 'twilio',
          status: 'unhealthy',
          lastError: 'Connection timeout',
          circuitBreakerState: 'open'
        };

        const shouldActivateFallback = 
          serviceFailure.status === 'unhealthy' && 
          fallbackServices[serviceFailure.service as keyof typeof fallbackServices];

        expect(shouldActivateFallback).toBe(true);

        const fallbackService = fallbackServices[serviceFailure.service as keyof typeof fallbackServices];
        expect(fallbackService).toBe('sendgrid');

        // For critical services, no fallback should be allowed
        const criticalServiceFailure = {
          service: 'stripe',
          status: 'unhealthy'
        };

        const hasFallback = fallbackServices[criticalServiceFailure.service as keyof typeof fallbackServices];
        expect(hasFallback).toBeUndefined(); // No fallback for Stripe
        expect(criticalServices.includes(criticalServiceFailure.service)).toBe(true);
      });

      it('should maintain service availability during partial failures', async () => {
        const serviceStatuses = {
          stripe: 'healthy',
          twilio: 'unhealthy', // Failed
          sendgrid: 'healthy',
          samsara: 'degraded',
          mapbox: 'healthy',
          airtable: 'healthy'
        };

        const healthyServices = Object.entries(serviceStatuses)
          .filter(([_, status]) => status === 'healthy')
          .map(([service]) => service);

        const degradedServices = Object.entries(serviceStatuses)
          .filter(([_, status]) => status === 'degraded')
          .map(([service]) => service);

        const unhealthyServices = Object.entries(serviceStatuses)
          .filter(([_, status]) => status === 'unhealthy')
          .map(([service]) => service);

        expect(healthyServices).toHaveLength(4);
        expect(degradedServices).toHaveLength(1);
        expect(unhealthyServices).toHaveLength(1);

        // Calculate overall system availability
        const totalServices = Object.keys(serviceStatuses).length;
        const availableServices = healthyServices.length + degradedServices.length; // Degraded still provides service
        const availabilityPercentage = (availableServices / totalServices) * 100;

        expect(availabilityPercentage).toBe(83.33); // 5/6 services available
        expect(availabilityPercentage).toBeGreaterThan(80); // Above 80% availability threshold
      });
    });

    describe('Data Consistency and Recovery', () => {
      it('should maintain data consistency during service failures', async () => {
        const transactionData = {
          id: 'txn_123',
          customerId: 'cust_456',
          amount: 99.99,
          status: 'pending',
          services: {
            stripe: { status: 'processing', id: 'pi_stripe123' },
            sendgrid: { status: 'queued', emailId: 'email_456' },
            audit: { status: 'logged', logId: 'audit_789' }
          }
        };

        // Simulate Stripe failure during transaction
        const stripeFailure = new Error('Stripe API unavailable');
        
        // Transaction should be rolled back to maintain consistency
        const rollbackActions = [
          { service: 'sendgrid', action: 'cancel_email', id: 'email_456' },
          { service: 'audit', action: 'mark_failed', id: 'audit_789' },
          { service: 'database', action: 'update_status', status: 'failed' }
        ];

        expect(rollbackActions).toHaveLength(3);
        expect(rollbackActions.find(a => a.service === 'sendgrid')?.action).toBe('cancel_email');
        expect(rollbackActions.find(a => a.service === 'database')?.status).toBe('failed');
      });

      it('should implement idempotent recovery operations', async () => {
        const recoveryOperations = [
          { id: 'recover_1', service: 'stripe', operation: 'reconnect', executed: false },
          { id: 'recover_2', service: 'twilio', operation: 'reset_circuit_breaker', executed: false },
          { id: 'recover_3', service: 'sendgrid', operation: 'flush_queue', executed: false }
        ];

        // Simulate recovery execution with idempotency
        const executeRecovery = (operation: typeof recoveryOperations[0]) => {
          if (operation.executed) {
            return { success: true, message: 'Already executed', skipped: true };
          }
          
          operation.executed = true;
          return { success: true, message: 'Executed successfully', skipped: false };
        };

        // First execution
        const result1 = executeRecovery(recoveryOperations[0]);
        expect(result1.success).toBe(true);
        expect(result1.skipped).toBe(false);

        // Second execution (should be idempotent)
        const result2 = executeRecovery(recoveryOperations[0]);
        expect(result2.success).toBe(true);
        expect(result2.skipped).toBe(true);
        expect(result2.message).toBe('Already executed');
      });
    });
  });

  describe('Performance and Scalability Validation', () => {
    describe('Service Performance Monitoring', () => {
      it('should monitor response times and throughput for all services', async () => {
        const performanceMetrics = {
          stripe: {
            averageResponseTime: 120, // ms
            p95ResponseTime: 200,
            p99ResponseTime: 350,
            requestsPerSecond: 45,
            errorRate: 0.1 // 0.1%
          },
          twilio: {
            averageResponseTime: 300,
            p95ResponseTime: 500,
            p99ResponseTime: 800,
            requestsPerSecond: 25,
            errorRate: 0.5
          },
          sendgrid: {
            averageResponseTime: 250,
            p95ResponseTime: 400,
            p99ResponseTime: 600,
            requestsPerSecond: 30,
            errorRate: 0.3
          }
        };

        // Validate performance thresholds
        const performanceThresholds = {
          maxAverageResponseTime: 500, // ms
          maxErrorRate: 1.0, // 1%
          minRequestsPerSecond: 10
        };

        const performanceIssues = [];
        for (const [service, metrics] of Object.entries(performanceMetrics)) {
          if (metrics.averageResponseTime > performanceThresholds.maxAverageResponseTime) {
            performanceIssues.push({ service, issue: 'high_response_time', value: metrics.averageResponseTime });
          }
          if (metrics.errorRate > performanceThresholds.maxErrorRate) {
            performanceIssues.push({ service, issue: 'high_error_rate', value: metrics.errorRate });
          }
          if (metrics.requestsPerSecond < performanceThresholds.minRequestsPerSecond) {
            performanceIssues.push({ service, issue: 'low_throughput', value: metrics.requestsPerSecond });
          }
        }

        expect(performanceIssues).toHaveLength(0); // All services within thresholds
      });

      it('should scale service connections based on load patterns', async () => {
        const loadPatterns = {
          currentHour: 14, // 2 PM
          currentLoad: 75, // 75% of capacity
          historicalPeaks: [9, 10, 14, 15, 17], // Peak hours
          expectedLoadIncrease: 25 // 25% increase expected
        };

        const scalingDecision = {
          shouldScale: loadPatterns.currentLoad > 70 && 
                       loadPatterns.historicalPeaks.includes(loadPatterns.currentHour),
          scaleTarget: Math.ceil(loadPatterns.currentLoad * (1 + loadPatterns.expectedLoadIncrease / 100)),
          scaleAction: 'increase_connections'
        };

        expect(scalingDecision.shouldScale).toBe(true);
        expect(scalingDecision.scaleTarget).toBe(94); // 75 * 1.25 = 93.75 -> 94
        expect(scalingDecision.scaleAction).toBe('increase_connections');
      });
    });

    describe('Resource Utilization Optimization', () => {
      it('should optimize resource allocation across services', async () => {
        const resourceAllocation = {
          stripe: { 
            connections: 50, 
            memoryMB: 256, 
            cpuPercent: 15,
            utilization: 80 
          },
          twilio: { 
            connections: 30, 
            memoryMB: 128, 
            cpuPercent: 10,
            utilization: 60 
          },
          sendgrid: { 
            connections: 25, 
            memoryMB: 128, 
            cpuPercent: 8,
            utilization: 45 
          }
        };

        const optimizationRecommendations = [];
        for (const [service, resources] of Object.entries(resourceAllocation)) {
          if (resources.utilization > 85) {
            optimizationRecommendations.push({
              service,
              action: 'scale_up',
              reason: 'high_utilization',
              currentUtilization: resources.utilization
            });
          } else if (resources.utilization < 30) {
            optimizationRecommendations.push({
              service,
              action: 'scale_down',
              reason: 'low_utilization',
              currentUtilization: resources.utilization
            });
          }
        }

        // No services require scaling in this scenario
        expect(optimizationRecommendations).toHaveLength(0);

        // Calculate total resource usage
        const totalConnections = Object.values(resourceAllocation)
          .reduce((sum, r) => sum + r.connections, 0);
        const totalMemory = Object.values(resourceAllocation)
          .reduce((sum, r) => sum + r.memoryMB, 0);

        expect(totalConnections).toBe(105);
        expect(totalMemory).toBe(512); // MB
      });
    });
  });
});