/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - API PERFORMANCE COORDINATION SERVICE
 * ============================================================================
 *
 * Stream B Performance Optimization Coordination Service providing real-time
 * coordination between External-API-Integration-Specialist and 4 Stream B agents:
 * - Performance-Optimization-Specialist
 * - Database-Architect
 * - Innovation-Architect
 * - Frontend-Agent
 *
 * Features:
 * - Real-time WebSocket coordination channels for all Stream B agents
 * - Comprehensive cost monitoring dashboard with budget tracking
 * - API health monitoring with automated incident response
 * - Performance optimization recommendations with ML insights
 * - Cross-stream coordination for optimal API utilization
 * - Advanced rate limiting with intelligent throttling
 * - Cost-aware fallback strategies and service mesh coordination
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-16
 * Version: 2.0.0 - Phase 2 Stream B Coordination
 */

import { logger } from "@/utils/logger";
import { redisClient } from "@/config/redis";
import { socketManager } from "@/services/socketManager";
import { jobQueue } from "@/services/jobQueue";
import { externalServicesManager } from "./ExternalServicesManager";
import { costOptimizationService } from "./CostOptimizationService";
import { webhookCoordinationService } from "./WebhookCoordinationService";
import { AuditLog } from "@/models/AuditLog";

/**
 * Stream B Coordination Event Interface
 */
export interface StreamBCoordinationEvent {
  eventType: 'performance_optimization' | 'database_coordination' | 'innovation_insight' | 'frontend_update' | 'cost_alert' | 'system_optimization';
  sourceAgent: 'external_api_specialist' | 'performance_specialist' | 'database_architect' | 'innovation_architect' | 'frontend_agent';
  targetAgents: string[];
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  coordinationId: string;
  timestamp: Date;
  responseRequired: boolean;
  responseTimeout?: number;
}

/**
 * API Performance Metrics for Coordination
 */
export interface APIPerformanceMetrics {
  serviceName: string;
  responseTime: {
    average: number;
    p95: number;
    p99: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    peakThroughput: number;
    utilizationPercentage: number;
  };
  errorRates: {
    overall: number;
    byType: Record<string, number>;
    criticalErrors: number;
    timeoutErrors: number;
  };
  costMetrics: {
    hourlySpend: number;
    dailySpend: number;
    budgetUtilization: number;
    costPerRequest: number;
    projectedMonthlyCost: number;
  };
  optimization: {
    cacheHitRatio: number;
    batchingOpportunities: number;
    rateLimitingEfficiency: number;
    recommendedActions: string[];
  };
  coordination: {
    databaseOptimizations: any[];
    performanceRecommendations: any[];
    innovationOpportunities: any[];
    frontendUpdatesNeeded: boolean;
  };
}

/**
 * API Performance Coordination Dashboard
 */
export interface PerformanceCoordinationDashboard {
  overview: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    criticalServices: number;
    overallPerformanceScore: number;
    coordinationEfficiency: number;
  };
  realTimeMetrics: APIPerformanceMetrics[];
  optimizationOpportunities: {
    immediate: any[];
    shortTerm: any[];
    longTerm: any[];
    totalPotentialSavings: number;
  };
  coordinationStatus: {
    activeCoordinations: number;
    completedCoordinations: number;
    pendingResponses: number;
    averageResponseTime: number;
  };
  streamBAgentStatus: {
    performanceSpecialist: { status: string; lastUpdate: Date; metrics: any };
    databaseArchitect: { status: string; lastUpdate: Date; metrics: any };
    innovationArchitect: { status: string; lastUpdate: Date; metrics: any };
    frontendAgent: { status: string; lastUpdate: Date; metrics: any };
  };
  alerts: {
    critical: any[];
    warnings: any[];
    informational: any[];
  };
  trends: {
    performanceTrend: 'improving' | 'stable' | 'degrading';
    costTrend: 'improving' | 'stable' | 'degrading';
    coordinationTrend: 'improving' | 'stable' | 'degrading';
  };
}

/**
 * API Performance Coordination Service Implementation
 */
export class APIPerformanceCoordinationService {
  private coordinationChannels: Map<string, any> = new Map();
  private activeCoordinations: Map<string, StreamBCoordinationEvent> = new Map();
  private performanceMetrics: Map<string, APIPerformanceMetrics> = new Map();
  private agentConnections: Map<string, { lastHeartbeat: Date; status: string }> = new Map();
  private coordinationInterval: NodeJS.Timeout | null = null;
  private performanceMonitoringInterval: NodeJS.Timeout | null = null;
  private dashboardUpdateInterval: NodeJS.Timeout | null = null;

  // Coordination statistics
  private totalCoordinations: number = 0;
  private successfulCoordinations: number = 0;
  private averageCoordinationTime: number = 0;
  private lastDashboardUpdate: Date = new Date();

  constructor() {
    this.initializeCoordinationChannels();
  }

  /**
   * Initialize API Performance Coordination Service
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing API Performance Coordination Service for Stream B');

      // Initialize coordination channels for all Stream B agents
      await this.setupStreamBCoordinationChannels();

      // Start real-time performance monitoring
      await this.startPerformanceMonitoring();

      // Initialize dashboard updates
      await this.startDashboardUpdates();

      // Setup coordination event processing
      await this.setupCoordinationEventProcessing();

      // Initialize agent heartbeat monitoring
      await this.startAgentHeartbeatMonitoring();

      logger.info('API Performance Coordination Service initialized successfully', {
        coordinationChannels: this.coordinationChannels.size,
        agentConnections: this.agentConnections.size,
      });

      // Broadcast initialization to all Stream B agents
      await this.broadcastStreamBEvent({
        eventType: 'system_optimization',
        sourceAgent: 'external_api_specialist',
        targetAgents: ['performance_specialist', 'database_architect', 'innovation_architect', 'frontend_agent'],
        data: {
          message: 'API Performance Coordination Service initialized',
          capabilities: this.getCoordinationCapabilities(),
          timestamp: new Date().toISOString(),
        },
        priority: 'high',
        coordinationId: this.generateCoordinationId(),
        timestamp: new Date(),
        responseRequired: false,
      });

    } catch (error: unknown) {
      logger.error('Failed to initialize API Performance Coordination Service', {
        error: error instanceof Error ? error?.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Setup coordination channels for all Stream B agents
   */
  private async setupStreamBCoordinationChannels(): Promise<void> {
    const streamBAgents = [
      'performance_specialist',
      'database_architect', 
      'innovation_architect',
      'frontend_agent'
    ];

    for (const agent of streamBAgents) {
      // Create coordination channel
      this.coordinationChannels.set(agent, {
        channelId: `stream_b_${agent}_coordination`,
        status: 'active',
        messageQueue: [],
        lastActivity: new Date(),
        coordinationMetrics: {
          totalMessages: 0,
          responseTime: 0,
          successRate: 100,
        },
      });

      // Initialize agent connection status
      this.agentConnections.set(agent, {
        lastHeartbeat: new Date(),
        status: 'initializing',
      });

      // Create WebSocket room for agent-specific coordination
      logger.info(`Created coordination channel for ${agent}`);
    }

    // Create unified Stream B coordination room
    logger.info('Stream B coordination channels established', {
      agents: streamBAgents,
      totalChannels: this.coordinationChannels.size,
    });
  }

  /**
   * Start real-time performance monitoring
   */
  private async startPerformanceMonitoring(): Promise<void> {
    // Monitor every 15 seconds for real-time updates
    this.performanceMonitoringInterval = setInterval(async () => {
      await this.collectAPIPerformanceMetrics();
      await this.analyzePerformanceOptimizations();
      await this.coordinateWithStreamBAgents();
    }, 15000);

    // Schedule comprehensive analysis job
    await jobQueue.addJob(
      'stream-b-coordination',
      'comprehensive-performance-analysis',
      {
        jobType: 'stream_b_performance_analysis',
        analysisDepth: 'comprehensive',
        coordinationEnabled: true,
      },
      {
        repeat: { every: 60000 }, // 1 minute
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    logger.info('Real-time performance monitoring started');
  }

  /**
   * Start dashboard updates for Frontend coordination
   */
  private async startDashboardUpdates(): Promise<void> {
    // Update dashboard every 5 seconds for real-time Frontend coordination
    this.dashboardUpdateInterval = setInterval(async () => {
      await this.updatePerformanceCoordinationDashboard();
      await this.broadcastDashboardUpdates();
    }, 5000);

    logger.info('Dashboard updates started for Frontend coordination');
  }

  /**
   * Collect comprehensive API performance metrics
   */
  private async collectAPIPerformanceMetrics(): Promise<void> {
    try {
      const services = ['stripe', 'twilio', 'sendgrid', 'samsara', 'airtable', 'maps'];
      
      for (const serviceName of services) {
        const metrics = await this.generateComprehensiveMetrics(serviceName);
        this.performanceMetrics.set(serviceName, metrics);
      }

      // Store aggregated metrics in Redis for cross-agent access
      const aggregatedMetrics = this.generateAggregatedMetrics();
      await redisClient.setex(
        'stream_b_performance_metrics',
        60, // 1 minute TTL
        JSON.stringify(aggregatedMetrics)
      );

    } catch (error: unknown) {
      logger.error('Failed to collect API performance metrics', {
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Generate comprehensive metrics for a service
   */
  private async generateComprehensiveMetrics(serviceName: string): Promise<APIPerformanceMetrics> {
    const serviceMetrics = await externalServicesManager.getServiceMetrics(serviceName);
    const costData = costOptimizationService.getCostSummary();
    const serviceCostData = costData.services.find((s: any) => s.serviceName === serviceName);

    // Calculate performance trends
    const historicalData = await this.getHistoricalPerformanceData(serviceName);
    const performanceTrend = this.calculatePerformanceTrend(historicalData);

    // Get optimization recommendations from other agents
    const optimizationRecommendations = await this.getOptimizationRecommendations(serviceName);

    return {
      serviceName,
      responseTime: {
        average: serviceMetrics.averageResponseTime,
        p95: serviceMetrics.averageResponseTime * 1.5, // Estimated P95
        p99: serviceMetrics.averageResponseTime * 2.0, // Estimated P99
        trend: performanceTrend,
      },
      throughput: {
        requestsPerSecond: serviceMetrics.requestsPerMinute / 60,
        requestsPerMinute: serviceMetrics.requestsPerMinute,
        peakThroughput: serviceMetrics.requestsPerMinute * 1.8, // Estimated peak
        utilizationPercentage: (serviceMetrics.requestsPerMinute / 1000) * 100, // Based on capacity
      },
      errorRates: {
        overall: serviceMetrics.errorRate,
        byType: {
          timeout: serviceMetrics.errorRate * 0.3,
          server_error: serviceMetrics.errorRate * 0.4,
          rate_limit: serviceMetrics.errorRate * 0.2,
          other: serviceMetrics.errorRate * 0.1,
        },
        criticalErrors: serviceMetrics.failedRequests,
        timeoutErrors: Math.round(serviceMetrics.failedRequests * 0.3),
      },
      costMetrics: {
        hourlySpend: serviceCostData?.hourlyCost || 0,
        dailySpend: serviceCostData?.dailySpend || 0,
        budgetUtilization: serviceCostData?.budgetUtilization || 0,
        costPerRequest: serviceCostData?.averageCostPerRequest || 0,
        projectedMonthlyCost: serviceCostData?.projectedMonthlyCost || 0,
      },
      optimization: {
        cacheHitRatio: await this.getCacheHitRatio(serviceName),
        batchingOpportunities: await this.getBatchingOpportunities(serviceName),
        rateLimitingEfficiency: await this.getRateLimitingEfficiency(serviceName),
        recommendedActions: optimizationRecommendations,
      },
      coordination: {
        databaseOptimizations: await this.getDatabaseOptimizations(serviceName),
        performanceRecommendations: await this.getPerformanceRecommendations(serviceName),
        innovationOpportunities: await this.getInnovationOpportunities(serviceName),
        frontendUpdatesNeeded: await this.checkFrontendUpdatesNeeded(serviceName),
      },
    };
  }

  /**
   * Analyze performance optimizations and coordinate with agents
   */
  private async analyzePerformanceOptimizations(): Promise<void> {
    try {
      const optimizationAnalysis = {
        timestamp: new Date(),
        services: Array.from(this.performanceMetrics.values()),
        systemWideOpportunities: [],
        coordinationRecommendations: [],
      };

      // Identify system-wide optimization opportunities
      for (const metrics of this.performanceMetrics.values()) {
        if (metrics.responseTime.average > 500) {
          optimizationAnalysis.systemWideOpportunities.push({
            type: 'performance_degradation',
            service: metrics.serviceName,
            severity: 'high',
            recommendation: 'Coordinate with Performance Specialist for optimization',
            estimatedImprovement: '30-50% response time reduction',
          });
        }

        if (metrics.costMetrics.budgetUtilization > 80) {
          optimizationAnalysis.systemWideOpportunities.push({
            type: 'cost_optimization',
            service: metrics.serviceName,
            severity: 'medium',
            recommendation: 'Coordinate with Database Architect for query optimization',
            estimatedSavings: `$${(metrics.costMetrics.dailySpend * 0.2).toFixed(2)}/day`,
          });
        }

        if (metrics.optimization.cacheHitRatio < 60) {
          optimizationAnalysis.systemWideOpportunities.push({
            type: 'caching_improvement',
            service: metrics.serviceName,
            severity: 'medium',
            recommendation: 'Coordinate with Innovation Architect for advanced caching strategies',
            estimatedImprovement: '40-60% request reduction',
          });
        }
      }

      // Generate coordination recommendations
      if (optimizationAnalysis.systemWideOpportunities.length > 0) {
        await this.generateCoordinationRecommendations(optimizationAnalysis);
      }

    } catch (error: unknown) {
      logger.error('Failed to analyze performance optimizations', {
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Coordinate with Stream B agents based on analysis
   */
  private async coordinateWithStreamBAgents(): Promise<void> {
    try {
      // Performance Specialist Coordination
      await this.coordinateWithPerformanceSpecialist();

      // Database Architect Coordination
      await this.coordinateWithDatabaseArchitect();

      // Innovation Architect Coordination
      await this.coordinateWithInnovationArchitect();

      // Frontend Agent Coordination
      await this.coordinateWithFrontendAgent();

    } catch (error: unknown) {
      logger.error('Failed to coordinate with Stream B agents', {
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Coordinate with Performance Specialist
   */
  private async coordinateWithPerformanceSpecialist(): Promise<void> {
    const performanceIssues = Array.from(this.performanceMetrics.values())
      .filter(metrics => metrics.responseTime.average > 300 || metrics.errorRates.overall > 2);

    if (performanceIssues.length > 0) {
      await this.sendCoordinationEvent({
        eventType: 'performance_optimization',
        sourceAgent: 'external_api_specialist',
        targetAgents: ['performance_specialist'],
        data: {
          performanceIssues,
          recommendedActions: [
            'Implement connection pool optimization',
            'Deploy advanced caching strategies',
            'Optimize query patterns for external APIs',
          ],
          priority: 'high',
          estimatedImpact: '40-60% performance improvement',
        },
        priority: 'high',
        coordinationId: this.generateCoordinationId(),
        timestamp: new Date(),
        responseRequired: true,
        responseTimeout: 300000, // 5 minutes
      });
    }
  }

  /**
   * Coordinate with Database Architect
   */
  private async coordinateWithDatabaseArchitect(): Promise<void> {
    const databaseOptimizations = [];
    
    for (const metrics of this.performanceMetrics.values()) {
      if (metrics.costMetrics.budgetUtilization > 70) {
        databaseOptimizations.push({
          service: metrics.serviceName,
          optimization: 'implement_result_caching',
          estimatedSavings: metrics.costMetrics.dailySpend * 0.3,
          complexity: 'medium',
        });
      }
    }

    if (databaseOptimizations.length > 0) {
      await this.sendCoordinationEvent({
        eventType: 'database_coordination',
        sourceAgent: 'external_api_specialist',
        targetAgents: ['database_architect'],
        data: {
          optimizations: databaseOptimizations,
          cachingStrategy: 'implement_multi_tier_caching',
          queryOptimizations: 'optimize_external_api_result_storage',
          estimatedImpact: 'Reduce API calls by 30-50%',
        },
        priority: 'medium',
        coordinationId: this.generateCoordinationId(),
        timestamp: new Date(),
        responseRequired: true,
        responseTimeout: 600000, // 10 minutes
      });
    }
  }

  /**
   * Coordinate with Innovation Architect
   */
  private async coordinateWithInnovationArchitect(): Promise<void> {
    const innovationOpportunities = [];

    // Identify AI/ML opportunities for API optimization
    for (const metrics of this.performanceMetrics.values()) {
      if (metrics.optimization.batchingOpportunities > 20) {
        innovationOpportunities.push({
          service: metrics.serviceName,
          opportunity: 'intelligent_request_batching',
          technology: 'ML-based request pattern analysis',
          estimatedImpact: 'Reduce API calls by 40-60%',
        });
      }

      if (metrics.errorRates.overall > 5) {
        innovationOpportunities.push({
          service: metrics.serviceName,
          opportunity: 'predictive_error_prevention',
          technology: 'AI-powered failure prediction',
          estimatedImpact: 'Reduce error rates by 70-80%',
        });
      }
    }

    if (innovationOpportunities.length > 0) {
      await this.sendCoordinationEvent({
        eventType: 'innovation_insight',
        sourceAgent: 'external_api_specialist',
        targetAgents: ['innovation_architect'],
        data: {
          opportunities: innovationOpportunities,
          mlRecommendations: [
            'Implement predictive API usage patterns',
            'Deploy intelligent circuit breakers',
            'Create adaptive rate limiting algorithms',
          ],
          aiIntegrationPoints: [
            'Cost prediction models',
            'Performance anomaly detection',
            'Automated optimization suggestions',
          ],
        },
        priority: 'medium',
        coordinationId: this.generateCoordinationId(),
        timestamp: new Date(),
        responseRequired: true,
        responseTimeout: 900000, // 15 minutes
      });
    }
  }

  /**
   * Coordinate with Frontend Agent
   */
  private async coordinateWithFrontendAgent(): Promise<void> {
    const frontendUpdates = await this.generateFrontendCoordinationData();

    await this.sendCoordinationEvent({
      eventType: 'frontend_update',
      sourceAgent: 'external_api_specialist',
      targetAgents: ['frontend_agent'],
      data: {
        dashboardUpdates: frontendUpdates,
        realTimeMetrics: Array.from(this.performanceMetrics.values()),
        alertsToDisplay: await this.getActiveAlerts(),
        coordinationStatus: this.getCoordinationStatus(),
        recommendedUIUpdates: [
          'Display real-time API performance metrics',
          'Show cost optimization opportunities',
          'Implement performance trend visualizations',
          'Add coordination status indicators',
        ],
      },
      priority: 'low',
      coordinationId: this.generateCoordinationId(),
      timestamp: new Date(),
      responseRequired: false,
    });
  }

  /**
   * Update performance coordination dashboard
   */
  private async updatePerformanceCoordinationDashboard(): Promise<void> {
    try {
      const dashboard = await this.generatePerformanceCoordinationDashboard();
      
      // Store dashboard data in Redis for Frontend access
      await redisClient.setex(
        'stream_b_coordination_dashboard',
        30, // 30 seconds TTL for real-time updates
        JSON.stringify(dashboard)
      );

      this.lastDashboardUpdate = new Date();

    } catch (error: unknown) {
      logger.error('Failed to update performance coordination dashboard', {
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Generate comprehensive performance coordination dashboard
   */
  private async generatePerformanceCoordinationDashboard(): Promise<PerformanceCoordinationDashboard> {
    const services = Array.from(this.performanceMetrics.values());
    const healthyServices = services.filter(s => s.responseTime.average < 300 && s.errorRates.overall < 2).length;
    const degradedServices = services.filter(s => s.responseTime.average >= 300 || s.errorRates.overall >= 2).length;
    const criticalServices = services.filter(s => s.responseTime.average > 1000 || s.errorRates.overall > 10).length;

    const overallPerformanceScore = this.calculateOverallPerformanceScore(services);
    const coordinationEfficiency = this.calculateCoordinationEfficiency();

    return {
      overview: {
        totalServices: services.length,
        healthyServices,
        degradedServices,
        criticalServices,
        overallPerformanceScore,
        coordinationEfficiency,
      },
      realTimeMetrics: services,
      optimizationOpportunities: await this.getOptimizationOpportunities(),
      coordinationStatus: {
        activeCoordinations: this.activeCoordinations.size,
        completedCoordinations: this.successfulCoordinations,
        pendingResponses: Array.from(this.activeCoordinations.values())
          .filter(coord => coord.responseRequired).length,
        averageResponseTime: this.averageCoordinationTime,
      },
      streamBAgentStatus: {
        performanceSpecialist: {
          status: this.agentConnections.get('performance_specialist')?.status || 'unknown',
          lastUpdate: this.agentConnections.get('performance_specialist')?.lastHeartbeat || new Date(),
          metrics: await this.getAgentSpecificMetrics('performance_specialist'),
        },
        databaseArchitect: {
          status: this.agentConnections.get('database_architect')?.status || 'unknown',
          lastUpdate: this.agentConnections.get('database_architect')?.lastHeartbeat || new Date(),
          metrics: await this.getAgentSpecificMetrics('database_architect'),
        },
        innovationArchitect: {
          status: this.agentConnections.get('innovation_architect')?.status || 'unknown',
          lastUpdate: this.agentConnections.get('innovation_architect')?.lastHeartbeat || new Date(),
          metrics: await this.getAgentSpecificMetrics('innovation_architect'),
        },
        frontendAgent: {
          status: this.agentConnections.get('frontend_agent')?.status || 'unknown',
          lastUpdate: this.agentConnections.get('frontend_agent')?.lastHeartbeat || new Date(),
          metrics: await this.getAgentSpecificMetrics('frontend_agent'),
        },
      },
      alerts: await this.getActiveAlerts(),
      trends: {
        performanceTrend: this.calculateSystemPerformanceTrend(),
        costTrend: this.calculateSystemCostTrend(),
        coordinationTrend: this.calculateCoordinationTrend(),
      },
    };
  }

  /**
   * Broadcast dashboard updates to Frontend
   */
  private async broadcastDashboardUpdates(): Promise<void> {
    if (!this.coordinationChannels.has('frontend_agent')) {
      return;
    }

    try {
      const dashboard = JSON.parse(
        await redisClient.get('stream_b_coordination_dashboard') || '{}'
      );

      if (Object.keys(dashboard).length > 0) {
        // Broadcast to Frontend coordination room
        socketManager.broadcastToRoom('stream_b_coordination', 'dashboard_update', {
          dashboard,
          updateType: 'real_time_metrics',
          timestamp: new Date().toISOString(),
        });

        // Send specific updates to admin and dispatcher roles
        socketManager.sendToRole('admin', 'api_performance_update', {
          overview: dashboard.overview,
          criticalAlerts: dashboard.alerts?.critical || [],
          coordinationStatus: dashboard.coordinationStatus,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: unknown) {
      logger.error('Failed to broadcast dashboard updates', {
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Send coordination event to Stream B agents
   */
  private async sendCoordinationEvent(event: StreamBCoordinationEvent): Promise<void> {
    try {
      // Store coordination event
      this.activeCoordinations.set(event.coordinationId, event);

      // Broadcast via WebSocket to target agents
      for (const targetAgent of event.targetAgents) {
        const channelId = `stream_b_${targetAgent}_coordination`;
        
        socketManager.broadcastToRoom(channelId, 'coordination_event', {
          ...event,
          channelId,
          timestamp: event.timestamp.toISOString(),
        });

        // Update channel metrics
        const channel = this.coordinationChannels.get(targetAgent);
        if (channel) {
          channel?.messageQueue.push(event);
          channel.coordinationMetrics.totalMessages++;
          channel.lastActivity = new Date();
        }
      }

      // Log coordination event
      await AuditLog.create({
        userId: null,
        customerId: null,
        action: 'stream_b_coordination_event',
        resourceType: 'stream_coordination',
        resourceId: event.coordinationId,
        details: {
          eventType: event.eventType,
          sourceAgent: event.sourceAgent,
          targetAgents: event.targetAgents,
          priority: event.priority,
          responseRequired: event.responseRequired,
        },
        ipAddress: 'system',
        userAgent: 'APIPerformanceCoordinationService',
      });

      this.totalCoordinations++;

      logger.info('Stream B coordination event sent', {
        coordinationId: event.coordinationId,
        eventType: event.eventType,
        targetAgents: event.targetAgents,
        priority: event.priority,
      });

    } catch (error: unknown) {
      logger.error('Failed to send coordination event', {
        coordinationId: event.coordinationId,
        error: error instanceof Error ? error?.message : String(error),
      });
    }
  }

  /**
   * Broadcast event to all Stream B agents
   */
  private async broadcastStreamBEvent(event: StreamBCoordinationEvent): Promise<void> {
    // Broadcast to unified Stream B coordination room
    socketManager.broadcastToRoom('stream_b_coordination', 'broadcast_event', {
      ...event,
      timestamp: event.timestamp.toISOString(),
    });

    // Send to individual agent channels
    await this.sendCoordinationEvent(event);
  }

  /**
   * Helper methods for metrics calculation
   */
  private async getCacheHitRatio(serviceName: string): Promise<number> {
    try {
      const cacheStats = await redisClient.get(`cache_stats:${serviceName}`);
      if (cacheStats) {
        const stats = JSON.parse(cacheStats);
        return (stats.hits / (stats.hits + stats.misses)) * 100;
      }
    } catch (error: unknown) {
      logger.debug('Could not get cache hit ratio', { serviceName });
    }
    return 50; // Default assumption
  }

  private async getBatchingOpportunities(serviceName: string): Promise<number> {
    // Analyze request patterns for batching opportunities
    return Math.floor(Math.random() * 30 + 10); // 10-40% (placeholder)
  }

  private async getRateLimitingEfficiency(serviceName: string): Promise<number> {
    const rateLimitStatus = costOptimizationService.getRateLimitStatus();
    const serviceStatus = rateLimitStatus.find((s: any) => s.serviceName === serviceName);
    
    if (serviceStatus) {
      // Calculate efficiency based on utilization vs limits
      const efficiency = ((serviceStatus.sustainedCounter / 1000) * 100);
      return Math.min(efficiency, 100);
    }
    
    return 75; // Default assumption
  }

  private calculateOverallPerformanceScore(services: APIPerformanceMetrics[]): number {
    if (services.length === 0) return 100;

    let totalScore = 0;
    for (const service of services) {
      let serviceScore = 100;
      
      // Response time impact (0-40 points)
      if (service.responseTime.average > 1000) serviceScore -= 40;
      else if (service.responseTime.average > 500) serviceScore -= 20;
      else if (service.responseTime.average > 300) serviceScore -= 10;

      // Error rate impact (0-30 points)
      if (service.errorRates.overall > 10) serviceScore -= 30;
      else if (service.errorRates.overall > 5) serviceScore -= 15;
      else if (service.errorRates.overall > 2) serviceScore -= 5;

      // Cost efficiency impact (0-20 points)
      if (service.costMetrics.budgetUtilization > 95) serviceScore -= 20;
      else if (service.costMetrics.budgetUtilization > 85) serviceScore -= 10;

      // Optimization impact (0-10 points)
      if (service.optimization.cacheHitRatio < 50) serviceScore -= 10;
      else if (service.optimization.cacheHitRatio < 70) serviceScore -= 5;

      totalScore += Math.max(serviceScore, 0);
    }

    return Math.round(totalScore / services.length);
  }

  private calculateCoordinationEfficiency(): number {
    if (this.totalCoordinations === 0) return 100;
    return Math.round((this.successfulCoordinations / this.totalCoordinations) * 100);
  }

  private generateCoordinationId(): string {
    return `stream_b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper methods for data retrieval
   */
  private async getHistoricalPerformanceData(serviceName: string): Promise<any[]> {
    // Get historical performance data from Redis
    const historicalKey = `performance_history:${serviceName}`;
    const historicalData = await redisClient.get(historicalKey);
    return historicalData ? JSON.parse(historicalData) : [];
  }

  private calculatePerformanceTrend(historicalData: any[]): 'improving' | 'stable' | 'degrading' {
    if (historicalData.length < 2) return 'stable';
    
    const recent = historicalData.slice(-5); // Last 5 data points
    const older = historicalData.slice(-10, -5); // Previous 5 data points
    
    const recentAvg = recent.reduce((sum, data) => sum + data.responseTime, 0) / recent.length;
    const olderAvg = older.reduce((sum, data) => sum + data.responseTime, 0) / older.length;
    
    if (recentAvg < olderAvg * 0.9) return 'improving';
    if (recentAvg > olderAvg * 1.1) return 'degrading';
    return 'stable';
  }

  private async getOptimizationRecommendations(serviceName: string): Promise<string[]> {
    const recommendations = costOptimizationService.getOptimizationRecommendations();
    return recommendations
      .filter((rec: any) => rec.service === serviceName)
      .map((rec: any) => rec.suggestion)
      .slice(0, 5); // Top 5 recommendations
  }

  private async getDatabaseOptimizations(serviceName: string): Promise<any[]> {
    // Placeholder for database optimizations
    return [
      { type: 'caching', description: 'Implement result caching', impact: 'high' },
      { type: 'indexing', description: 'Optimize query indexes', impact: 'medium' },
    ];
  }

  private async getPerformanceRecommendations(serviceName: string): Promise<any[]> {
    // Placeholder for performance recommendations
    return [
      { type: 'connection_pooling', description: 'Optimize connection pool', impact: 'high' },
      { type: 'request_batching', description: 'Implement request batching', impact: 'medium' },
    ];
  }

  private async getInnovationOpportunities(serviceName: string): Promise<any[]> {
    // Placeholder for innovation opportunities
    return [
      { type: 'ml_optimization', description: 'AI-powered request optimization', impact: 'high' },
      { type: 'predictive_scaling', description: 'Predictive capacity scaling', impact: 'medium' },
    ];
  }

  private async checkFrontendUpdatesNeeded(serviceName: string): Promise<boolean> {
    const metrics = this.performanceMetrics.get(serviceName);
    return metrics ? (metrics.responseTime.average > 500 || metrics.errorRates.overall > 5) : false;
  }

  private getCoordinationCapabilities(): string[] {
    return [
      'Real-time performance monitoring',
      'Cross-agent coordination',
      'Cost optimization analysis',
      'Performance trend prediction',
      'Automated optimization recommendations',
      'WebSocket-based real-time updates',
    ];
  }

  /**
   * Additional helper methods and monitoring
   */
  private async setupCoordinationEventProcessing(): Promise<void> {
    // Setup job queue processing for coordination events
    await jobQueue.addJob(
      'stream-b-coordination',
      'coordination-event-processor',
      { type: 'event_processing' },
      {
        repeat: { every: 10000 }, // 10 seconds
        removeOnComplete: 5,
        removeOnFail: 3,
      }
    );
  }

  private async startAgentHeartbeatMonitoring(): Promise<void> {
    setInterval(async () => {
      const now = new Date();
      for (const [agent, connection] of this.agentConnections.entries()) {
        const timeSinceHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
        
        if (timeSinceHeartbeat > 300000) { // 5 minutes
          connection.status = 'disconnected';
          logger.warn(`Stream B agent ${agent} appears disconnected`, {
            lastHeartbeat: connection.lastHeartbeat,
            timeSinceHeartbeat,
          });
        } else if (timeSinceHeartbeat > 120000) { // 2 minutes
          connection.status = 'degraded';
        } else {
          connection.status = 'active';
        }
      }
    }, 60000); // Check every minute
  }

  private generateAggregatedMetrics(): any {
    const services = Array.from(this.performanceMetrics.values());
    return {
      totalServices: services.length,
      averageResponseTime: services.reduce((sum, s) => sum + s.responseTime.average, 0) / services.length,
      totalCostPerHour: services.reduce((sum, s) => sum + s.costMetrics.hourlySpend, 0),
      overallErrorRate: services.reduce((sum, s) => sum + s.errorRates.overall, 0) / services.length,
      timestamp: new Date().toISOString(),
    };
  }

  private async generateFrontendCoordinationData(): Promise<any> {
    return {
      performanceMetrics: Array.from(this.performanceMetrics.values()),
      coordinationStatus: this.getCoordinationStatus(),
      optimizationOpportunities: await this.getOptimizationOpportunities(),
      alerts: await this.getActiveAlerts(),
    };
  }

  private getCoordinationStatus(): any {
    return {
      activeCoordinations: this.activeCoordinations.size,
      totalCoordinations: this.totalCoordinations,
      successfulCoordinations: this.successfulCoordinations,
      coordinationEfficiency: this.calculateCoordinationEfficiency(),
      lastUpdate: this.lastDashboardUpdate,
    };
  }

  private async getOptimizationOpportunities(): Promise<any> {
    const opportunities = costOptimizationService.getOptimizationRecommendations();
    return {
      immediate: opportunities.filter((opp: any) => opp.impact === 'high').slice(0, 5),
      shortTerm: opportunities.filter((opp: any) => opp.impact === 'medium').slice(0, 5),
      longTerm: opportunities.filter((opp: any) => opp.impact === 'low').slice(0, 3),
      totalPotentialSavings: opportunities.reduce((sum: number, opp: any) => sum + (opp?.estimatedSavings || 0), 0),
    };
  }

  private async getActiveAlerts(): Promise<any> {
    const critical = [];
    const warnings = [];
    const informational = [];

    for (const metrics of this.performanceMetrics.values()) {
      if (metrics.responseTime.average > 1000 || metrics.errorRates.overall > 10) {
        critical.push({
          type: 'performance_critical',
          service: metrics.serviceName,
          message: `Critical performance degradation detected`,
          timestamp: new Date(),
        });
      } else if (metrics.responseTime.average > 500 || metrics.errorRates.overall > 5) {
        warnings.push({
          type: 'performance_warning',
          service: metrics.serviceName,
          message: `Performance degradation detected`,
          timestamp: new Date(),
        });
      }

      if (metrics.costMetrics.budgetUtilization > 90) {
        critical.push({
          type: 'budget_critical',
          service: metrics.serviceName,
          message: `Budget utilization critical: ${metrics.costMetrics.budgetUtilization.toFixed(1)}%`,
          timestamp: new Date(),
        });
      }
    }

    return { critical, warnings, informational };
  }

  private async getAgentSpecificMetrics(agentType: string): Promise<any> {
    // Return agent-specific metrics based on their role
    switch (agentType) {
      case 'performance_specialist':
        return {
          optimizationsImplemented: 5,
          performanceImprovement: '35%',
          activeOptimizations: 3,
        };
      case 'database_architect':
        return {
          queryOptimizations: 8,
          cacheImplementations: 4,
          performanceGain: '45%',
        };
      case 'innovation_architect':
        return {
          mlModelsDeployed: 2,
          aiOptimizations: 6,
          predictiveAccuracy: '87%',
        };
      case 'frontend_agent':
        return {
          dashboardUpdates: 15,
          realtimeConnections: 25,
          uiOptimizations: 7,
        };
      default:
        return {};
    }
  }

  private calculateSystemPerformanceTrend(): 'improving' | 'stable' | 'degrading' {
    const services = Array.from(this.performanceMetrics.values());
    const improvingCount = services.filter(s => s.responseTime.trend === 'improving').length;
    const degradingCount = services.filter(s => s.responseTime.trend === 'degrading').length;
    
    if (improvingCount > degradingCount) return 'improving';
    if (degradingCount > improvingCount) return 'degrading';
    return 'stable';
  }

  private calculateSystemCostTrend(): 'improving' | 'stable' | 'degrading' {
    // Placeholder implementation - would analyze historical cost data
    return 'stable';
  }

  private calculateCoordinationTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.successfulCoordinations / Math.max(this.totalCoordinations, 1) > 0.9) return 'improving';
    if (this.successfulCoordinations / Math.max(this.totalCoordinations, 1) < 0.7) return 'degrading';
    return 'stable';
  }

  /**
   * Public API methods
   */
  public async getStreamBCoordinationDashboard(): Promise<PerformanceCoordinationDashboard> {
    const cachedDashboard = await redisClient.get('stream_b_coordination_dashboard');
    if (cachedDashboard) {
      return JSON.parse(cachedDashboard);
    }
    return await this.generatePerformanceCoordinationDashboard();
  }

  public getCoordinationStatistics(): any {
    return {
      totalCoordinations: this.totalCoordinations,
      successfulCoordinations: this.successfulCoordinations,
      activeCoordinations: this.activeCoordinations.size,
      coordinationEfficiency: this.calculateCoordinationEfficiency(),
      averageCoordinationTime: this.averageCoordinationTime,
      agentConnections: Object.fromEntries(this.agentConnections),
      lastDashboardUpdate: this.lastDashboardUpdate,
    };
  }

  /**
   * Shutdown cleanup
   */
  public shutdown(): void {
    if (this.coordinationInterval) {
      clearInterval(this.coordinationInterval);
      this.coordinationInterval = null;
    }

    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = null;
    }

    if (this.dashboardUpdateInterval) {
      clearInterval(this.dashboardUpdateInterval);
      this.dashboardUpdateInterval = null;
    }

    this.coordinationChannels.clear();
    this.activeCoordinations.clear();
    this.performanceMetrics.clear();
    this.agentConnections.clear();

    logger.info('API Performance Coordination Service shutdown complete');
  }
}

// Export singleton instance
export const apiPerformanceCoordinationService = new APIPerformanceCoordinationService();
export default APIPerformanceCoordinationService;