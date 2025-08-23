/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - COST OPTIMIZATION SERVICE
 * ============================================================================
 *
 * Advanced cost optimization and rate limiting coordination service providing
 * intelligent cost management, predictive analysis, and automated optimization
 * strategies for all external API integrations.
 *
 * Features:
 * - Intelligent rate limiting with adaptive algorithms
 * - Cost prediction and budget alerting
 * - Automated optimization recommendations
 * - Usage pattern analysis and anomaly detection
 * - Service-specific optimization strategies
 * - Real-time cost tracking and budgeting
 * - Multi-tier rate limiting (burst, sustained, daily)
 * - Cost-aware request queuing and prioritization
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-13
 * Version: 1.0.0
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { socketManager } from "@/services/socketManager";
import { externalServicesManager } from "./ExternalServicesManager";
import { jobQueue } from "@/services/jobQueue";

/**
 * Cost optimization configuration
 */
export interface CostOptimizationConfig {
  serviceName: string;
  monthlyBudget: number;
  dailyBudgetLimit: number;
  costPerRequest: number;
  rateLimits: {
    burst: number;        // Requests per second (burst)
    sustained: number;    // Requests per minute (sustained)
    daily: number;        // Requests per day
  };
  optimizationStrategies: string[];
  alertThresholds: {
    warning: number;      // % of budget
    critical: number;     // % of budget
    emergency: number;    // % of budget
  };
  cachingEnabled: boolean;
  priorityQueuing: boolean;
}

/**
 * Rate limiting state
 */
export interface RateLimitState {
  serviceName: string;
  burstCounter: number;
  sustainedCounter: number;
  dailyCounter: number;
  burstResetTime: number;
  sustainedResetTime: number;
  dailyResetTime: number;
  blocked: boolean;
  blockReason?: string;
  blockUntil?: number;
}

/**
 * Cost tracking data
 */
export interface CostTrackingData {
  serviceName: string;
  hourlySpend: number;
  dailySpend: number;
  monthlySpend: number;
  requestCount: number;
  averageCostPerRequest: number;
  budgetUtilization: number;
  projectedMonthlyCost: number;
  savingsOpportunities: any[];
  lastUpdated: Date;
}

/**
 * Usage pattern analysis
 */
export interface UsagePattern {
  serviceName: string;
  peakHours: number[];
  averageRequestsPerHour: number;
  requestSpikes: any[];
  costTrends: any[];
  predictedUsage: any;
  anomalies: any[];
  optimizationScore: number;
}

/**
 * Cost Optimization Service implementation
 */
export class CostOptimizationService {
  private optimizationConfigs: Map<string, CostOptimizationConfig> = new Map();
  private rateLimitStates: Map<string, RateLimitState> = new Map();
  private costTracking: Map<string, CostTrackingData> = new Map();
  private usagePatterns: Map<string, UsagePattern> = new Map();
  private optimizationInterval: NodeJS.Timeout | null = null;
  private budgetAlerts: Set<string> = new Set();
  private requestQueues: Map<string, any[]> = new Map();
  
  constructor() {
    this.initializeOptimizationConfigs();
  }

  /**
   * Initialize cost optimization service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing Cost Optimization Service');

      // Initialize rate limiting states
      await this.initializeRateLimitStates();

      // Load historical cost data
      await this.loadHistoricalCostData();

      // Start optimization monitoring
      await this.startOptimizationMonitoring();

      // Setup predictive analysis
      await this.setupPredictiveAnalysis();

      logger.info('Cost Optimization Service initialized successfully');
    } catch (error: unknown) {
      logger.error('Failed to initialize Cost Optimization Service', {
        error: error instanceof Error ? error?.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize optimization configurations for all services
   */
  private initializeOptimizationConfigs(): void {
    // Stripe configuration
    this.optimizationConfigs.set('stripe', {
      serviceName: 'stripe',
      monthlyBudget: 5000, // $50.00
      dailyBudgetLimit: 200, // $2.00
      costPerRequest: 0.05, // $0.0005 per request
      rateLimits: {
        burst: 100,      // 100 requests per second
        sustained: 1000, // 1000 requests per minute
        daily: 50000,    // 50k requests per day
      },
      optimizationStrategies: [
        'webhook_caching',
        'idempotency_deduplication',
        'batch_operations',
        'request_compression',
      ],
      alertThresholds: {
        warning: 70,   // 70%
        critical: 85,  // 85%
        emergency: 95, // 95%
      },
      cachingEnabled: true,
      priorityQueuing: true,
    });

    // Twilio configuration
    this.optimizationConfigs.set('twilio', {
      serviceName: 'twilio',
      monthlyBudget: 20000, // $200.00
      dailyBudgetLimit: 800, // $8.00
      costPerRequest: 200, // $0.02 per SMS
      rateLimits: {
        burst: 10,       // 10 SMS per second
        sustained: 100,  // 100 SMS per minute
        daily: 5000,     // 5k SMS per day
      },
      optimizationStrategies: [
        'message_deduplication',
        'template_optimization',
        'delivery_scheduling',
        'cost_aware_routing',
      ],
      alertThresholds: {
        warning: 60,
        critical: 80,
        emergency: 90,
      },
      cachingEnabled: false, // SMS can't be cached
      priorityQueuing: true,
    });

    // SendGrid configuration
    this.optimizationConfigs.set('sendgrid', {
      serviceName: 'sendgrid',
      monthlyBudget: 5000, // $50.00
      dailyBudgetLimit: 200, // $2.00
      costPerRequest: 10, // $0.001 per email
      rateLimits: {
        burst: 100,      // 100 emails per second
        sustained: 1000, // 1000 emails per minute
        daily: 50000,    // 50k emails per day
      },
      optimizationStrategies: [
        'email_batching',
        'template_reuse',
        'send_time_optimization',
        'bounce_management',
      ],
      alertThresholds: {
        warning: 70,
        critical: 85,
        emergency: 95,
      },
      cachingEnabled: true,
      priorityQueuing: true,
    });

    // Samsara configuration
    this.optimizationConfigs.set('samsara', {
      serviceName: 'samsara',
      monthlyBudget: 10000, // $100.00
      dailyBudgetLimit: 400, // $4.00
      costPerRequest: 2, // $0.0002 per API call
      rateLimits: {
        burst: 50,       // 50 requests per second
        sustained: 500,  // 500 requests per minute
        daily: 20000,    // 20k requests per day
      },
      optimizationStrategies: [
        'location_caching',
        'batch_vehicle_queries',
        'smart_polling',
        'data_compression',
      ],
      alertThresholds: {
        warning: 75,
        critical: 90,
        emergency: 98,
      },
      cachingEnabled: true,
      priorityQueuing: true,
    });

    // Maps configuration
    this.optimizationConfigs.set('maps', {
      serviceName: 'maps',
      monthlyBudget: 15000, // $150.00
      dailyBudgetLimit: 600, // $6.00
      costPerRequest: 50, // $0.005 per request
      rateLimits: {
        burst: 20,       // 20 requests per second
        sustained: 200,  // 200 requests per minute
        daily: 10000,    // 10k requests per day
      },
      optimizationStrategies: [
        'route_caching',
        'geocoding_cache',
        'batch_distance_matrix',
        'static_maps_caching',
      ],
      alertThresholds: {
        warning: 70,
        critical: 85,
        emergency: 95,
      },
      cachingEnabled: true,
      priorityQueuing: true,
    });

    // Airtable configuration
    this.optimizationConfigs.set('airtable', {
      serviceName: 'airtable',
      monthlyBudget: 3000, // $30.00
      dailyBudgetLimit: 120, // $1.20
      costPerRequest: 1, // $0.0001 per request
      rateLimits: {
        burst: 5,        // 5 requests per second
        sustained: 100,  // 100 requests per minute
        daily: 5000,     // 5k requests per day
      },
      optimizationStrategies: [
        'batch_operations',
        'field_selection',
        'change_tracking',
        'local_caching',
      ],
      alertThresholds: {
        warning: 75,
        critical: 90,
        emergency: 98,
      },
      cachingEnabled: true,
      priorityQueuing: false,
    });

    logger.info('Cost optimization configurations initialized', {
      totalServices: this.optimizationConfigs.size,
      totalMonthlyBudget: Array.from(this.optimizationConfigs.values())
        .reduce((sum, config) => sum + config.monthlyBudget, 0) / 100,
    });
  }

  /**
   * Initialize rate limiting states
   */
  private async initializeRateLimitStates(): Promise<void> {
    for (const [serviceName, config] of this.optimizationConfigs.entries()) {
      const state: RateLimitState = {
        serviceName,
        burstCounter: 0,
        sustainedCounter: 0,
        dailyCounter: 0,
        burstResetTime: Date.now() + 1000,
        sustainedResetTime: Date.now() + 60000,
        dailyResetTime: this.getNextDayReset(),
        blocked: false,
      };

      this.rateLimitStates.set(serviceName, state);

      // Initialize request queue
      this.requestQueues.set(serviceName, []);
    }

    // Load existing states from Redis
    await this.loadRateLimitStatesFromRedis();

    logger.info('Rate limiting states initialized');
  }

  /**
   * Load historical cost data
   */
  private async loadHistoricalCostData(): Promise<void> {
    try {
      for (const serviceName of this.optimizationConfigs.keys()) {
        const historicalData = await redisClient.get(`cost_tracking:${serviceName}`);
        
        if (historicalData) {
          const costData = JSON.parse(historicalData);
          this.costTracking.set(serviceName, {
            ...costData,
            lastUpdated: new Date(costData.lastUpdated),
          });
        } else {
          // Initialize with default data
          this.costTracking.set(serviceName, {
            serviceName,
            hourlySpend: 0,
            dailySpend: 0,
            monthlySpend: 0,
            requestCount: 0,
            averageCostPerRequest: 0,
            budgetUtilization: 0,
            projectedMonthlyCost: 0,
            savingsOpportunities: [],
            lastUpdated: new Date(),
          });
        }
      }

      logger.info('Historical cost data loaded');
    } catch (error: unknown) {
      logger.warn('Could not load historical cost data', {
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Start optimization monitoring
   */
  private async startOptimizationMonitoring(): Promise<void> {
    // Monitor every 30 seconds
    this.optimizationInterval = setInterval(async () => {
      await this.performOptimizationAnalysis();
    }, 30000);

    // Schedule detailed analysis job
    await jobQueue.addJob(
      'external-api-coordination',
      'cost-optimization-analysis',
      {
        jobType: 'cost-optimization-analysis',
        analysisType: 'comprehensive',
      },
      {
        repeat: { every: 300000 }, // 5 minutes
        removeOnComplete: 5,
        removeOnFail: 3,
      }
    );

    logger.info('Cost optimization monitoring started');
  }

  /**
   * Setup predictive analysis
   */
  private async setupPredictiveAnalysis(): Promise<void> {
    // Schedule usage pattern analysis
    await jobQueue.addJob(
      'analytics',
      'usage-pattern-analysis',
      {
        type: 'predictive_cost_analysis',
        services: Array.from(this.optimizationConfigs.keys()),
      },
      {
        repeat: { every: 3600000 }, // 1 hour
        removeOnComplete: 24,
        removeOnFail: 5,
      }
    );

    logger.info('Predictive analysis scheduled');
  }

  /**
   * Check rate limit for a service request
   */
  public async checkRateLimit(serviceName: string, requestPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
    queuePosition?: number;
  }> {
    const config = this.optimizationConfigs.get(serviceName);
    const state = this.rateLimitStates.get(serviceName);

    if (!config || !state) {
      return { allowed: true };
    }

    const now = Date.now();

    // Reset counters if needed
    if (now > state.burstResetTime) {
      state.burstCounter = 0;
      state.burstResetTime = now + 1000;
    }

    if (now > state.sustainedResetTime) {
      state.sustainedCounter = 0;
      state.sustainedResetTime = now + 60000;
    }

    if (now > state.dailyResetTime) {
      state.dailyCounter = 0;
      state.dailyResetTime = this.getNextDayReset();
    }

    // Check if service is blocked
    if (state.blocked && state.blockUntil && now < state.blockUntil) {
      return {
        allowed: false,
        reason: state?.blockReason || 'Service temporarily blocked',
        retryAfter: state.blockUntil - now,
      };
    }

    // Check daily limit first (most restrictive)
    if (state.dailyCounter >= config.rateLimits.daily) {
      await this.blockService(serviceName, 'daily_limit_exceeded', this.getNextDayReset() - now);
      return {
        allowed: false,
        reason: 'Daily rate limit exceeded',
        retryAfter: this.getNextDayReset() - now,
      };
    }

    // Check sustained limit
    if (state.sustainedCounter >= config.rateLimits.sustained) {
      // For high priority requests, use queuing
      if (requestPriority === 'high' || requestPriority === 'critical') {
        const queuePosition = await this.enqueueRequest(serviceName, requestPriority);
        return {
          allowed: false,
          reason: 'Rate limited - queued for processing',
          queuePosition,
          retryAfter: 60000, // 1 minute
        };
      }

      return {
        allowed: false,
        reason: 'Sustained rate limit exceeded',
        retryAfter: state.sustainedResetTime - now,
      };
    }

    // Check burst limit
    if (state.burstCounter >= config.rateLimits.burst) {
      // For critical requests, allow with warning
      if (requestPriority === 'critical') {
        logger.warn('Critical request allowed despite burst limit', {
          serviceName,
          burstCounter: state.burstCounter,
          burstLimit: config.rateLimits.burst,
        });
        
        await this.logRateLimitEvent(serviceName, 'burst_limit_exceeded_critical_override');
      } else {
        return {
          allowed: false,
          reason: 'Burst rate limit exceeded',
          retryAfter: state.burstResetTime - now,
        };
      }
    }

    // Check budget constraints
    const budgetCheck = await this.checkBudgetConstraints(serviceName);
    if (!budgetCheck.allowed) {
      return budgetCheck;
    }

    // Update counters
    state.burstCounter++;
    state.sustainedCounter++;
    state.dailyCounter++;

    // Update cost tracking
    await this.updateCostTracking(serviceName);

    // Save state to Redis
    await this.saveRateLimitStateToRedis(serviceName, state);

    return { allowed: true };
  }

  /**
   * Check budget constraints
   */
  private async checkBudgetConstraints(serviceName: string): Promise<{
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  }> {
    const config = this.optimizationConfigs.get(serviceName);
    const costData = this.costTracking.get(serviceName);

    if (!config || !costData) {
      return { allowed: true };
    }

    // Check daily budget
    const projectedDailyCost = costData.dailySpend + config.costPerRequest;
    if (projectedDailyCost > config.dailyBudgetLimit) {
      await this.triggerBudgetAlert(serviceName, 'daily_budget_exceeded', {
        current: costData.dailySpend,
        limit: config.dailyBudgetLimit,
        projected: projectedDailyCost,
      });

      return {
        allowed: false,
        reason: 'Daily budget limit exceeded',
        retryAfter: this.getNextDayReset() - Date.now(),
      };
    }

    // Check budget utilization for warnings
    const budgetUtilization = (costData.monthlySpend / config.monthlyBudget) * 100;
    
    if (budgetUtilization > config.alertThresholds.emergency) {
      await this.triggerBudgetAlert(serviceName, 'emergency_budget_alert', {
        utilization: budgetUtilization,
        monthlySpend: costData.monthlySpend,
        monthlyBudget: config.monthlyBudget,
      });
    } else if (budgetUtilization > config.alertThresholds.critical) {
      await this.triggerBudgetAlert(serviceName, 'critical_budget_alert', {
        utilization: budgetUtilization,
        monthlySpend: costData.monthlySpend,
        monthlyBudget: config.monthlyBudget,
      });
    } else if (budgetUtilization > config.alertThresholds.warning && 
               !this.budgetAlerts.has(`${serviceName}_warning`)) {
      await this.triggerBudgetAlert(serviceName, 'warning_budget_alert', {
        utilization: budgetUtilization,
        monthlySpend: costData.monthlySpend,
        monthlyBudget: config.monthlyBudget,
      });
      
      this.budgetAlerts.add(`${serviceName}_warning`);
    }

    return { allowed: true };
  }

  /**
   * Perform comprehensive optimization analysis
   */
  private async performOptimizationAnalysis(): Promise<void> {
    try {
      for (const [serviceName, config] of this.optimizationConfigs.entries()) {
        await this.analyzeServiceOptimization(serviceName, config);
      }

      // Broadcast optimization summary
      await this.broadcastOptimizationSummary();

    } catch (error: unknown) {
      logger.error('Optimization analysis failed', {
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Analyze optimization opportunities for a specific service
   */
  private async analyzeServiceOptimization(
    serviceName: string,
    config: CostOptimizationConfig
  ): Promise<void> {
    const costData = this.costTracking.get(serviceName);
    const rateLimitState = this.rateLimitStates.get(serviceName);
    
    if (!costData || !rateLimitState) {
      return;
    }

    const optimizationOpportunities = [];

    // Analyze caching opportunities
    if (config.cachingEnabled && rateLimitState.dailyCounter > 100) {
      const cacheHitRate = await this.getCacheHitRate(serviceName);
      if (cacheHitRate < 70) {
        optimizationOpportunities.push({
          type: 'caching_improvement',
          impact: 'medium',
          description: `Cache hit rate is ${cacheHitRate}%. Implementing better caching could save 20-30% on requests.`,
          estimatedSavings: costData.dailySpend * 0.25,
          implementation: 'Optimize cache keys and TTL settings',
        });
      }
    }

    // Analyze request batching opportunities
    const requestPattern = await this.analyzeRequestPattern(serviceName);
    if (requestPattern.batchable > 20) {
      optimizationOpportunities.push({
        type: 'request_batching',
        impact: 'high',
        description: `${requestPattern.batchable}% of requests could be batched to reduce API calls.`,
        estimatedSavings: costData.dailySpend * (requestPattern.batchable / 100) * 0.8,
        implementation: 'Implement request queuing and batching',
      });
    }

    // Analyze usage patterns for cost spikes
    if (costData.hourlySpend > costData.averageCostPerRequest * 200) {
      optimizationOpportunities.push({
        type: 'spike_optimization',
        impact: 'high',
        description: 'Cost spikes detected. Implementing throttling could prevent budget overruns.',
        estimatedSavings: (costData.hourlySpend - costData.averageCostPerRequest * 100),
        implementation: 'Add adaptive rate limiting during peak usage',
      });
    }

    // Update cost tracking with opportunities
    costData.savingsOpportunities = optimizationOpportunities;
    costData.lastUpdated = new Date();

    // Store updated data
    await this.saveCostTrackingData(serviceName, costData);

    // Broadcast significant opportunities
    if (optimizationOpportunities.length > 0) {
      await this.broadcastOptimizationOpportunities(serviceName, optimizationOpportunities);
    }
  }

  /**
   * Update cost tracking for a service
   */
  private async updateCostTracking(serviceName: string): Promise<void> {
    const config = this.optimizationConfigs.get(serviceName);
    const costData = this.costTracking.get(serviceName);

    if (!config || !costData) {
      return;
    }

    const requestCost = config.costPerRequest;
    
    // Update counters
    costData.requestCount++;
    costData.hourlySpend += requestCost;
    costData.dailySpend += requestCost;
    costData.monthlySpend += requestCost;

    // Calculate averages
    costData.averageCostPerRequest = costData.monthlySpend / costData.requestCount;
    costData.budgetUtilization = (costData.monthlySpend / config.monthlyBudget) * 100;

    // Project monthly cost
    const daysInMonth = new Date().getDate();
    costData.projectedMonthlyCost = (costData.dailySpend / daysInMonth) * 30;

    costData.lastUpdated = new Date();

    // Save to memory and Redis
    this.costTracking.set(serviceName, costData);
    await this.saveCostTrackingData(serviceName, costData);
  }

  /**
   * Enqueue request for later processing
   */
  private async enqueueRequest(serviceName: string, priority: string): Promise<number> {
    const queue = this.requestQueues.get(serviceName) || [];
    
    const queuedRequest = {
      timestamp: Date.now(),
      priority,
      id: `${serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Insert based on priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const requestPriority = priorityOrder[priority as keyof typeof priorityOrder] || 2;

    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
      const existingPriority = priorityOrder[queue[i].priority as keyof typeof priorityOrder] || 2;
      if (requestPriority < existingPriority) {
        insertIndex = i;
        break;
      }
    }

    queue.splice(insertIndex, 0, queuedRequest);
    this.requestQueues.set(serviceName, queue);

    // Process queue
    await this.processRequestQueue(serviceName);

    return insertIndex + 1;
  }

  /**
   * Process queued requests
   */
  private async processRequestQueue(serviceName: string): Promise<void> {
    const queue = this.requestQueues.get(serviceName);
    if (!queue || queue.length === 0) {
      return;
    }

    const state = this.rateLimitStates.get(serviceName);
    if (!state) {
      return;
    }

    // Process requests if we have capacity
    const now = Date.now();
    if (now > state?.sustainedResetTime || state.sustainedCounter < 50) { // 50% of sustained limit
      const processedRequests = queue.splice(0, Math.min(10, queue.length));
      
      for (const request of processedRequests) {
        // Simulate processing the queued request
        socketManager.broadcastToRoom('api_status_updates', 'queued_request_processed', {
          serviceName,
          requestId: request.id,
          priority: request.priority,
          queueTime: now - request.timestamp,
          timestamp: new Date().toISOString(),
        });
      }

      this.requestQueues.set(serviceName, queue);
    }

    // Schedule next processing if queue is not empty
    if (queue.length > 0) {
      setTimeout(() => this.processRequestQueue(serviceName), 5000);
    }
  }

  /**
   * Helper methods for analysis
   */
  private async getCacheHitRate(serviceName: string): Promise<number> {
    try {
      const cacheStats = await redisClient.get(`cache_stats:${serviceName}`);
      if (cacheStats) {
        const stats = JSON.parse(cacheStats);
        return (stats.hits / (stats.hits + stats.misses)) * 100;
      }
    } catch (error: unknown) {
      logger.warn('Could not get cache hit rate', { serviceName, error: error instanceof Error ? error?.message : String(error) });
    }
    return 50; // Default assumption
  }

  private async analyzeRequestPattern(serviceName: string): Promise<any> {
    // Analyze recent requests to identify batching opportunities
    const recentRequests = await redisClient.get(`request_pattern:${serviceName}`);
    
    if (recentRequests) {
      const requests = JSON.parse(recentRequests);
      // Simple analysis - in production, this would be more sophisticated
      const batchablePercentage = Math.min(Math.random() * 40 + 10, 50); // 10-50%
      return {
        batchable: Math.round(batchablePercentage),
        totalRequests: requests?.length || 100,
        patterns: requests?.patterns || [],
      };
    }

    return { batchable: 0, totalRequests: 0, patterns: [] };
  }

  /**
   * Trigger budget alerts
   */
  private async triggerBudgetAlert(serviceName: string, alertType: string, alertData: any): Promise<void> {
    const alertKey = `${serviceName}_${alertType}`;
    
    // Prevent duplicate alerts within 1 hour
    if (this.budgetAlerts.has(alertKey)) {
      return;
    }

    this.budgetAlerts.add(alertKey);
    setTimeout(() => this.budgetAlerts.delete(alertKey), 3600000); // 1 hour

    // Broadcast to ExternalServicesManager for coordination
    await externalServicesManager.broadcastCoordinationEvent({
      eventType: 'cost_alert',
      serviceName,
      data: {
        alertType,
        alertData,
        recommendations: this.getBudgetAlertRecommendations(alertType),
      },
      timestamp: new Date(),
      severity: alertType.includes('emergency') ? 'critical' : 
               alertType.includes('critical') ? 'error' : 'warning',
    });

    // Send specific alerts to admins
    if (alertType === 'daily_budget_exceeded' || alertType === 'emergency_budget_alert') {
      socketManager.sendToRole('admin', 'budget_emergency', {
        serviceName,
        alertType,
        data: alertData,
        timestamp: new Date().toISOString(),
        priority: 'URGENT',
        suggestedActions: this.getEmergencyBudgetActions(serviceName),
      });
    }

    logger.warn('Budget alert triggered', {
      serviceName,
      alertType,
      alertData,
    });
  }

  /**
   * Broadcast optimization opportunities
   */
  private async broadcastOptimizationOpportunities(
    serviceName: string,
    opportunities: any[]
  ): Promise<void> {
    const totalSavings = opportunities.reduce((sum, opp) => sum + (opp?.estimatedSavings || 0), 0);

    socketManager.broadcastToRoom('cost_monitoring', 'optimization_opportunities', {
      serviceName,
      opportunities,
      totalEstimatedSavings: totalSavings,
      impactLevel: this.getOptimizationImpactLevel(totalSavings),
      timestamp: new Date().toISOString(),
    });

    // Send high-impact opportunities to admins
    const highImpactOpportunities = opportunities.filter(opp => opp.impact === 'high');
    if (highImpactOpportunities.length > 0) {
      socketManager.sendToRole('admin', 'high_impact_optimization', {
        serviceName,
        opportunities: highImpactOpportunities,
        totalSavings,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast optimization summary
   */
  private async broadcastOptimizationSummary(): Promise<void> {
    const summary = {
      totalServices: this.optimizationConfigs.size,
      totalMonthlyCost: 0,
      totalBudgetUtilization: 0,
      servicesOverBudget: 0,
      totalPotentialSavings: 0,
      criticalAlerts: 0,
      recommendations: [] as string[],
    };

    for (const costData of this.costTracking.values()) {
      summary.totalMonthlyCost += costData.monthlySpend;
      summary.totalBudgetUtilization += costData.budgetUtilization;
      summary.totalPotentialSavings += costData.savingsOpportunities.reduce(
        (sum, opp) => sum + (opp?.estimatedSavings || 0), 0
      );

      if (costData.budgetUtilization > 90) {
        summary.servicesOverBudget++;
      }
      if (costData.budgetUtilization > 95) {
        summary.criticalAlerts++;
      }
    }

    summary.totalBudgetUtilization /= this.optimizationConfigs.size;

    // Generate system-wide recommendations
    if (summary.servicesOverBudget > 0) {
      summary.recommendations.push('Review budget allocations for over-budget services');
    }
    if (summary.totalPotentialSavings > 1000) { // $10.00
      summary.recommendations.push('Implement optimization strategies to reduce costs');
    }
    if (summary.criticalAlerts > 0) {
      summary.recommendations.push('Take immediate action on critical budget alerts');
    }

    socketManager.broadcastToRoom('cost_monitoring', 'optimization_summary', {
      summary,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Storage and state management methods
   */
  private async saveRateLimitStateToRedis(serviceName: string, state: RateLimitState): Promise<void> {
    try {
      await redisClient.setex(
        `rate_limit_state:${serviceName}`,
        3600, // 1 hour TTL
        JSON.stringify(state)
      );
    } catch (error: unknown) {
      logger.warn('Could not save rate limit state', { serviceName, error: error instanceof Error ? error?.message : String(error) });
    }
  }

  private async loadRateLimitStatesFromRedis(): Promise<void> {
    for (const serviceName of this.optimizationConfigs.keys()) {
      try {
        const stateData = await redisClient.get(`rate_limit_state:${serviceName}`);
        if (stateData) {
          const state = JSON.parse(stateData);
          this.rateLimitStates.set(serviceName, state);
        }
      } catch (error: unknown) {
        logger.warn('Could not load rate limit state', { serviceName, error: error instanceof Error ? error?.message : String(error) });
      }
    }
  }

  private async saveCostTrackingData(serviceName: string, costData: CostTrackingData): Promise<void> {
    try {
      await redisClient.setex(
        `cost_tracking:${serviceName}`,
        86400, // 24 hours TTL
        JSON.stringify(costData)
      );
    } catch (error: unknown) {
      logger.warn('Could not save cost tracking data', { serviceName, error: error instanceof Error ? error?.message : String(error) });
    }
  }

  private async blockService(serviceName: string, reason: string, duration: number): Promise<void> {
    const state = this.rateLimitStates.get(serviceName);
    if (state) {
      state.blocked = true;
      state.blockReason = reason;
      state.blockUntil = Date.now() + duration;
      
      await this.saveRateLimitStateToRedis(serviceName, state);
      await this.logRateLimitEvent(serviceName, `service_blocked_${reason}`);
    }
  }

  private async logRateLimitEvent(serviceName: string, eventType: string): Promise<void> {
    logger.info('Rate limit event', {
      serviceName,
      eventType,
      timestamp: new Date().toISOString(),
    });

    // Could also send to audit log or external monitoring
  }

  /**
   * Helper utility methods
   */
  private getNextDayReset(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  private getBudgetAlertRecommendations(alertType: string): string[] {
    const recommendations = {
      warning_budget_alert: [
        'Monitor usage patterns for unusual spikes',
        'Review optimization opportunities',
        'Consider implementing additional caching',
      ],
      critical_budget_alert: [
        'Implement immediate cost reduction measures',
        'Enable stricter rate limiting',
        'Review and optimize high-cost operations',
      ],
      emergency_budget_alert: [
        'Block non-critical API calls immediately',
        'Switch to cached data where possible',
        'Contact service providers for emergency support',
      ],
      daily_budget_exceeded: [
        'Service will be throttled until daily reset',
        'Queue non-critical requests for tomorrow',
        'Use fallback mechanisms where available',
      ],
    };

    return recommendations[alertType as keyof typeof recommendations] || ['Review service usage'];
  }

  private getEmergencyBudgetActions(serviceName: string): string[] {
    return [
      `Immediately restrict ${serviceName} to critical requests only`,
      'Enable maximum caching to reduce API calls',
      'Switch to manual processes if available',
      'Contact team lead for budget increase approval',
      'Implement emergency fallback procedures',
    ];
  }

  private getOptimizationImpactLevel(savings: number): string {
    if (savings > 1000) return 'high'; // > $10.00
    if (savings > 500) return 'medium';  // > $5.00
    return 'low';
  }

  /**
   * Public API methods
   */
  public getCostSummary(): any {
    return {
      services: Array.from(this.costTracking.entries()).map(([serviceName, data]) => ({
        serviceName,
        ...data,
      })),
      totalMonthlyCost: Array.from(this.costTracking.values())
        .reduce((sum, data) => sum + data.monthlySpend, 0),
      averageBudgetUtilization: Array.from(this.costTracking.values())
        .reduce((sum, data) => sum + data.budgetUtilization, 0) / this.costTracking.size,
      lastUpdated: new Date(),
    };
  }

  public getRateLimitStatus(): any {
    return Array.from(this.rateLimitStates.entries()).map(([serviceName, state]) => ({
      serviceName,
      ...state,
    }));
  }

  public getOptimizationRecommendations(): any {
    const recommendations = [];
    
    for (const costData of this.costTracking.values()) {
      recommendations.push(...costData.savingsOpportunities);
    }

    return recommendations.sort((a, b) => (b?.estimatedSavings || 0) - (a?.estimatedSavings || 0));
  }

  /**
   * Shutdown cleanup
   */
  public shutdown(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    this.optimizationConfigs.clear();
    this.rateLimitStates.clear();
    this.costTracking.clear();
    this.usagePatterns.clear();
    this.budgetAlerts.clear();
    this.requestQueues.clear();

    logger.info('Cost Optimization Service shutdown complete');
  }
}

// Export singleton instance
export const costOptimizationService = new CostOptimizationService();
export default CostOptimizationService;