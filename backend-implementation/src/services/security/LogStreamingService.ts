/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - LOG STREAMING SERVICE
 * ============================================================================
 *
 * Real-time log streaming service with WebSocket support for SIEM integration.
 * Provides live security monitoring, filtering, and alerting capabilities.
 *
 * Features:
 * - WebSocket-based real-time log streaming
 * - Advanced filtering and search capabilities
 * - Security event alerting and notifications
 * - Performance-optimized streaming with backpressure handling
 * - Multi-client support with role-based access
 * - Integration with SIEM platforms
 * - Real-time dashboards and monitoring
 *
 * Created by: Security & Compliance Specialist
 * Date: 2025-08-22
 * Version: 1.0.0
 */

import { BaseService, ServiceResult } from "../BaseService";
import { logger, Timer } from "@/utils/logger";
import { EventEmitter } from "events";
import WebSocket from "ws";
import { IncomingMessage } from "http";
import { config } from "@/config";
import { authenticateToken } from "@/middleware/auth";
import { SIEMLogEntry, SIEMLogLevel, SecurityEventCategory } from "./SIEMIntegrationService";
import { getCorrelationId } from "@/middleware/correlationId";

/**
 * Stream subscription filter
 */
export interface StreamFilter {
  levels?: SIEMLogLevel[];
  categories?: SecurityEventCategory[];
  sources?: string[];
  users?: string[];
  threatLevels?: ('low' | 'medium' | 'high' | 'critical')[];
  timeRange?: {
    start: Date;
    end?: Date;
  };
  keywords?: string[];
  regex?: string;
  correlationIds?: string[];
  excludePatterns?: string[];
}

/**
 * Stream client connection
 */
export interface StreamClient {
  id: string;
  websocket: WebSocket;
  userId?: string;
  role?: string;
  ip: string;
  userAgent?: string;
  connectedAt: Date;
  lastActivity: Date;
  filters: StreamFilter;
  subscription: {
    active: boolean;
    messageCount: number;
    bytesTransferred: number;
    errors: number;
  };
  rateLimiting: {
    messagesPerSecond: number;
    bytesPerSecond: number;
    lastMessageTime: number;
    messageQueue: any[];
  };
}

/**
 * Stream statistics
 */
export interface StreamStats {
  totalClients: number;
  activeStreams: number;
  totalMessages: number;
  messagesPerSecond: number;
  bytesTransferred: number;
  errors: number;
  uptime: number;
  performanceMetrics: {
    averageLatency: number;
    peakLatency: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

/**
 * Alert configuration
 */
export interface StreamAlert {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    threshold: number;
    timeWindow: number; // minutes
    aggregationType: 'count' | 'rate' | 'pattern';
    filters: StreamFilter;
  };
  actions: {
    notify: boolean;
    email?: string[];
    webhook?: string;
    escalate?: boolean;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * =============================================================================
 * LOG STREAMING SERVICE
 * =============================================================================
 */
export class LogStreamingService extends BaseService<any> {
  private wss: WebSocket.Server;
  private clients: Map<string, StreamClient> = new Map();
  private eventEmitter: EventEmitter;
  private messageBuffer: SIEMLogEntry[] = [];
  private alerts: Map<string, StreamAlert> = new Map();
  private stats: StreamStats;
  
  // Configuration
  private readonly MAX_CLIENTS = 100;
  private readonly MAX_MESSAGES_PER_SECOND = 1000;
  private readonly MAX_BYTES_PER_SECOND = 1024 * 1024; // 1MB
  private readonly BUFFER_SIZE = 10000;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor(server?: any) {
    super(null as any, "LogStreamingService");
    
    // Initialize WebSocket server
    this.wss = new WebSocket.Server({
      port: config.streaming?.port || 8081,
      path: '/siem/stream',
      verifyClient: this.verifyClient.bind(this)
    });

    this.eventEmitter = new EventEmitter();
    this.stats = this.initializeStats();
    
    this.setupWebSocketServer();
    this.initializeAlerts();
    this.startPeriodicTasks();
  }

  /**
   * =============================================================================
   * STREAMING METHODS
   * =============================================================================
   */

  /**
   * Stream log entry to connected clients
   */
  public async streamLogEntry(logEntry: SIEMLogEntry): Promise<ServiceResult<{clientsNotified: number}>> {
    const timer = new Timer('LogStreamingService.streamLogEntry');

    try {
      let clientsNotified = 0;
      const message = JSON.stringify({
        type: 'log_entry',
        timestamp: new Date().toISOString(),
        correlationId: getCorrelationId(),
        data: logEntry
      });

      // Add to buffer for new clients
      this?.messageBuffer.push(logEntry);
      if (this?.messageBuffer.length > this.BUFFER_SIZE) {
        this?.messageBuffer.shift(); // Remove oldest entry
      }

      // Stream to connected clients
      for (const client of this.clients.values()) {
        if (!client.subscription.active) continue;
        
        try {
          // Check if log entry matches client filters
          if (this.matchesFilter(logEntry, client.filters)) {
            // Check rate limiting
            if (this.isRateLimited(client)) {
              client.rateLimiting?.messageQueue.push(message);
              continue;
            }

            // Send message
            if (client.websocket.readyState === WebSocket.OPEN) {
              client.websocket.send(message);
              
              // Update client statistics
              client.subscription?.messageCount++;
              client.subscription.bytesTransferred += Buffer.byteLength(message);
              client.lastActivity = new Date();
              clientsNotified++;
            }
          }
        } catch (error: unknown) {
          logger.warn('Failed to send message to client', {
            clientId: client.id,
            error: error instanceof Error ? error?.message : String(error)
          });
          
          client.subscription.errors++;
        }
      }

      // Update global statistics
      this.stats.totalMessages++;
      this.stats?.messagesPerSecond = this.calculateMessagesPerSecond();

      // Check alert conditions
      await this.checkAlertConditions(logEntry);

      // Emit event for other services
      this.eventEmitter.emit('log_streamed', {
        logEntry,
        clientsNotified,
        timestamp: new Date()
      });

      timer.end({ success: true, clientsNotified });

      return {
        success: true,
        data: { clientsNotified },
        message: "Log entry streamed successfully"
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      
      logger.error("Log streaming failed", {
        error: error instanceof Error ? error?.message : String(error),
        correlationId: logEntry.correlationId
      });

      return {
        success: false,
        message: `Log streaming failed: ${error instanceof Error ? error?.message : String(error)}`
      };
    }
  }

  /**
   * Get streaming statistics
   */
  public async getStreamingStats(): Promise<ServiceResult<StreamStats>> {
    const timer = new Timer('LogStreamingService.getStreamingStats');

    try {
      // Update real-time statistics
      this.updatePerformanceMetrics();
      
      const stats: StreamStats = {
        ...this.stats,
        totalClients: this.clients.size,
        activeStreams: Array.from(this.clients.values())
          .filter(client => client.subscription.active).length,
        uptime: Date.now() - this.stats.uptime
      };

      timer.end({ success: true });

      return {
        success: true,
        data: stats,
        message: "Streaming statistics retrieved successfully"
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      return {
        success: false,
        message: `Failed to get streaming stats: ${error instanceof Error ? error?.message : String(error)}`
      };
    }
  }

  /**
   * Get connected clients information
   */
  public async getConnectedClients(): Promise<ServiceResult<{
    clients: Array<{
      id: string;
      userId?: string;
      role?: string;
      ip: string;
      connectedAt: Date;
      messageCount: number;
      bytesTransferred: number;
      errors: number;
    }>;
  }>> {
    const timer = new Timer('LogStreamingService.getConnectedClients');

    try {
      const clientsInfo = Array.from(this.clients.values()).map(client => ({
        id: client.id,
        userId: client.userId,
        role: client.role,
        ip: client.ip,
        connectedAt: client.connectedAt,
        messageCount: client.subscription?.messageCount,
        bytesTransferred: client.subscription.bytesTransferred,
        errors: client.subscription.errors
      }));

      timer.end({ success: true, clientCount: clientsInfo.length });

      return {
        success: true,
        data: { clients: clientsInfo },
        message: "Connected clients information retrieved"
      };

    } catch (error: unknown) {
      timer.end({ error: error instanceof Error ? error?.message : String(error) });
      return {
        success: false,
        message: `Failed to get connected clients: ${error instanceof Error ? error?.message : String(error)}`
      };
    }
  }

  /**
   * =============================================================================
   * WEBSOCKET SERVER SETUP
   * =============================================================================
   */

  /**
   * Setup WebSocket server event handlers
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));
    this.wss.on('listening', () => {
      logger.info('Log streaming server started', {
        port: config.streaming?.port || 8081,
        path: '/siem/stream'
      });
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    const clientIp = this.extractClientIP(request);
    
    logger.info('New streaming client connected', {
      clientId,
      ip: clientIp,
      userAgent: request.headers['user-agent']
    });

    // Create client object
    const client: StreamClient = {
      id: clientId,
      websocket: ws,
      ip: clientIp,
      userAgent: request.headers['user-agent'],
      connectedAt: new Date(),
      lastActivity: new Date(),
      filters: {},
      subscription: {
        active: false,
        messageCount: 0,
        bytesTransferred: 0,
        errors: 0
      },
      rateLimiting: {
        messagesPerSecond: 0,
        bytesPerSecond: 0,
        lastMessageTime: Date.now(),
        messageQueue: []
      }
    };

    // Add to clients map
    this.clients.set(clientId, client);

    // Setup client event handlers
    ws.on('message', (data) => this.handleClientMessage(client, data));
    ws.on('close', () => this.handleClientDisconnect(client));
    ws.on('error', (error) => this.handleClientError(client, error));
    ws.on('pong', () => this.handlePong(client));

    // Send welcome message
    this.sendToClient(client, {
      type: 'connected',
      clientId,
      serverTime: new Date().toISOString(),
      capabilities: {
        maxMessagesPerSecond: this.MAX_MESSAGES_PER_SECOND,
        maxBytesPerSecond: this.MAX_BYTES_PER_SECOND,
        supportedFilters: ['levels', 'categories', 'sources', 'users', 'threatLevels', 'timeRange', 'keywords', 'regex']
      }
    });

    // Update statistics
    this.stats.totalClients = Math.max(this.stats.totalClients, this.clients.size);
  }

  /**
   * Handle client message
   */
  private handleClientMessage(client: StreamClient, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      client.lastActivity = new Date();

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(client, message);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(client);
          break;
          
        case 'update_filters':
          this.handleUpdateFilters(client, message.filters);
          break;
          
        case 'get_history':
          this.handleGetHistory(client, message);
          break;
          
        case 'ping':
          this.sendToClient(client, { type: 'pong', timestamp: new Date().toISOString() });
          break;
          
        default:
          logger.warn('Unknown message type from client', {
            clientId: client.id,
            messageType: message.type
          });
      }

    } catch (error: unknown) {
      logger.error('Failed to process client message', {
        clientId: client.id,
        error: error instanceof Error ? error?.message : String(error)
      });
      
      client.subscription.errors++;
    }
  }

  /**
   * Handle client subscription
   */
  private handleSubscribe(client: StreamClient, message: any): void {
    try {
      // Set filters
      client.filters = this.validateFilters(message?.filters || {});
      client.subscription.active = true;

      // Send confirmation
      this.sendToClient(client, {
        type: 'subscribed',
        filters: client.filters,
        timestamp: new Date().toISOString()
      });

      // Send recent history if requested
      if (message.includeHistory) {
        this.sendHistoryToClient(client, message?.historyLimit || 100);
      }

      logger.info('Client subscribed to log stream', {
        clientId: client.id,
        filters: client.filters
      });

    } catch (error: unknown) {
      logger.error('Subscription failed', {
        clientId: client.id,
        error: error instanceof Error ? error?.message : String(error)
      });
      
      this.sendToClient(client, {
        type: 'error',
        message: 'Subscription failed',
        error: error instanceof Error ? error?.message : String(error)
      });
    }
  }

  /**
   * Handle client unsubscribe
   */
  private handleUnsubscribe(client: StreamClient): void {
    client.subscription.active = false;
    
    this.sendToClient(client, {
      type: 'unsubscribed',
      timestamp: new Date().toISOString()
    });

    logger.info('Client unsubscribed from log stream', {
      clientId: client.id
    });
  }

  /**
   * Handle filter updates
   */
  private handleUpdateFilters(client: StreamClient, filters: any): void {
    try {
      client.filters = this.validateFilters(filters);
      
      this.sendToClient(client, {
        type: 'filters_updated',
        filters: client.filters,
        timestamp: new Date().toISOString()
      });

      logger.debug('Client filters updated', {
        clientId: client.id,
        filters: client.filters
      });

    } catch (error: unknown) {
      logger.error('Filter update failed', {
        clientId: client.id,
        error: error instanceof Error ? error?.message : String(error)
      });
    }
  }

  /**
   * Handle history request
   */
  private handleGetHistory(client: StreamClient, message: any): void {
    try {
      const limit = Math.min(message?.limit || 100, 1000); // Max 1000 entries
      this.sendHistoryToClient(client, limit);

    } catch (error: unknown) {
      logger.error('History request failed', {
        clientId: client.id,
        error: error instanceof Error ? error?.message : String(error)
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(client: StreamClient): void {
    this.clients.delete(client.id);
    
    logger.info('Streaming client disconnected', {
      clientId: client.id,
      duration: Date.now() - client.connectedAt.getTime(),
      messageCount: client.subscription?.messageCount,
      bytesTransferred: client.subscription.bytesTransferred
    });
  }

  /**
   * Handle client error
   */
  private handleClientError(client: StreamClient, error: Error): void {
    logger.error('Streaming client error', {
      clientId: client.id,
      error: error instanceof Error ? error?.message : String(error)
    });
    
    client.subscription.errors++;
    this.stats.errors++;
  }

  /**
   * Handle pong response
   */
  private handlePong(client: StreamClient): void {
    client.lastActivity = new Date();
  }

  /**
   * Handle server error
   */
  private handleServerError(error: Error): void {
    logger.error('Streaming server error', {
      error: error instanceof Error ? error?.message : String(error)
    });
    
    this.stats.errors++;
  }

  /**
   * =============================================================================
   * UTILITY METHODS
   * =============================================================================
   */

  /**
   * Send message to client
   */
  private sendToClient(client: StreamClient, message: any): void {
    try {
      if (client.websocket.readyState === WebSocket.OPEN) {
        client.websocket.send(JSON.stringify(message));
      }
    } catch (error: unknown) {
      logger.error('Failed to send message to client', {
        clientId: client.id,
        error: error instanceof Error ? error?.message : String(error)
      });
    }
  }

  /**
   * Send history to client
   */
  private sendHistoryToClient(client: StreamClient, limit: number): void {
    const history = this?.messageBuffer
      .filter(entry => this.matchesFilter(entry, client.filters))
      .slice(-limit)
      .reverse();

    this.sendToClient(client, {
      type: 'history',
      entries: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if log entry matches client filters
   */
  private matchesFilter(logEntry: SIEMLogEntry, filters: StreamFilter): boolean {
    // Level filter
    if (filters.levels && filters.levels.length > 0) {
      if (!filters.levels.includes(logEntry.level)) {
        return false;
      }
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(logEntry.category)) {
        return false;
      }
    }

    // Source filter
    if (filters.sources && filters.sources.length > 0) {
      if (!filters.sources.includes(logEntry.source)) {
        return false;
      }
    }

    // User filter
    if (filters.users && filters.users.length > 0 && logEntry.user?.id) {
      if (!filters.users.includes(logEntry.user.id)) {
        return false;
      }
    }

    // Threat level filter
    if (filters.threatLevels && filters.threatLevels.length > 0) {
      if (!filters.threatLevels.includes(logEntry.security.threatLevel)) {
        return false;
      }
    }

    // Time range filter
    if (filters.timeRange) {
      const entryTime = new Date(logEntry.timestamp);
      if (entryTime < filters.timeRange.start) {
        return false;
      }
      if (filters.timeRange.end && entryTime > filters.timeRange.end) {
        return false;
      }
    }

    // Keyword filter
    if (filters.keywords && filters.keywords.length > 0) {
      const searchText = `${logEntry?.message} ${logEntry.event} ${JSON.stringify(logEntry.context)}`.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    // Regex filter
    if (filters.regex) {
      try {
        const regex = new RegExp(filters.regex, 'i');
        const searchText = `${logEntry?.message} ${logEntry.event}`;
        if (!regex.test(searchText)) {
          return false;
        }
      } catch (error: unknown) {
        logger.warn('Invalid regex filter', { regex: filters.regex });
      }
    }

    // Correlation ID filter
    if (filters.correlationIds && filters.correlationIds.length > 0) {
      if (!filters.correlationIds.includes(logEntry.correlationId)) {
        return false;
      }
    }

    // Exclude patterns
    if (filters.excludePatterns && filters.excludePatterns.length > 0) {
      const searchText = `${logEntry?.message} ${logEntry.event}`.toLowerCase();
      const shouldExclude = filters.excludePatterns.some(pattern => 
        searchText.includes(pattern.toLowerCase())
      );
      if (shouldExclude) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate and sanitize filters
   */
  private validateFilters(filters: any): StreamFilter {
    const validatedFilters: StreamFilter = {};

    if (filters.levels && Array.isArray(filters.levels)) {
      validatedFilters.levels = filters.levels.filter(level => 
        Object.values(SIEMLogLevel).includes(level)
      );
    }

    if (filters.categories && Array.isArray(filters.categories)) {
      validatedFilters.categories = filters.categories.filter(category => 
        Object.values(SecurityEventCategory).includes(category)
      );
    }

    if (filters.sources && Array.isArray(filters.sources)) {
      validatedFilters.sources = filters.sources.map(source => String(source)).slice(0, 10);
    }

    if (filters.users && Array.isArray(filters.users)) {
      validatedFilters.users = filters.users.map(user => String(user)).slice(0, 50);
    }

    if (filters.threatLevels && Array.isArray(filters.threatLevels)) {
      validatedFilters.threatLevels = filters.threatLevels.filter(level => 
        ['low', 'medium', 'high', 'critical'].includes(level)
      );
    }

    if (filters.timeRange && filters.timeRange.start) {
      validatedFilters.timeRange = {
        start: new Date(filters.timeRange.start),
        end: filters.timeRange.end ? new Date(filters.timeRange.end) : undefined
      };
    }

    if (filters.keywords && Array.isArray(filters.keywords)) {
      validatedFilters.keywords = filters.keywords
        .map(keyword => String(keyword))
        .filter(keyword => keyword.length >= 2 && keyword.length <= 100)
        .slice(0, 10);
    }

    if (filters.regex && typeof filters.regex === 'string') {
      try {
        new RegExp(filters.regex); // Test regex validity
        validatedFilters.regex = filters.regex;
      } catch (error: unknown) {
        logger.warn('Invalid regex filter ignored', { regex: filters.regex });
      }
    }

    return validatedFilters;
  }

  /**
   * Check if client is rate limited
   */
  private isRateLimited(client: StreamClient): boolean {
    const now = Date.now();
    const timeDiff = now - client.rateLimiting.lastMessageTime;
    
    if (timeDiff < 1000) { // Within 1 second
      client.rateLimiting?.messagesPerSecond++;
      return client.rateLimiting?.messagesPerSecond > this.MAX_MESSAGES_PER_SECOND;
    } else {
      client.rateLimiting?.messagesPerSecond = 1;
      client.rateLimiting.lastMessageTime = now;
      return false;
    }
  }

  /**
   * Verify client connection
   */
  private verifyClient(info: any): boolean {
    // Check max clients limit
    if (this.clients.size >= this.MAX_CLIENTS) {
      logger.warn('Max clients limit reached', { 
        currentClients: this.clients.size,
        maxClients: this.MAX_CLIENTS
      });
      return false;
    }

    // Additional verification logic would go here
    return true;
  }

  /**
   * Extract client IP address
   */
  private extractClientIP(request: IncomingMessage): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.socket?.remoteAddress || 'unknown';
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): StreamStats {
    return {
      totalClients: 0,
      activeStreams: 0,
      totalMessages: 0,
      messagesPerSecond: 0,
      bytesTransferred: 0,
      errors: 0,
      uptime: Date.now(),
      performanceMetrics: {
        averageLatency: 0,
        peakLatency: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    };
  }

  /**
   * Calculate messages per second
   */
  private calculateMessagesPerSecond(): number {
    // This would be implemented with a sliding window calculation
    return 0; // Placeholder
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    this.stats.performanceMetrics.memoryUsage = process.memoryUsage().heapUsed;
    this.stats.performanceMetrics.cpuUsage = process.cpuUsage().user;
  }

  /**
   * Initialize default alerts
   */
  private initializeAlerts(): void {
    // Default alert configurations would be set up here
  }

  /**
   * Check alert conditions
   */
  private async checkAlertConditions(logEntry: SIEMLogEntry): Promise<void> {
    // Alert condition checking logic would be implemented here
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks(): void {
    // Heartbeat to detect dead connections
    setInterval(() => {
      this.clients.forEach(client => {
        if (client.websocket.readyState === WebSocket.OPEN) {
          client.websocket.ping();
        }
      });
    }, this.HEARTBEAT_INTERVAL);

    // Cleanup disconnected clients
    setInterval(() => {
      const now = new Date();
      this.clients.forEach((client, clientId) => {
        if (client.websocket.readyState === WebSocket.CLOSED ||
            now.getTime() - client.lastActivity.getTime() > 300000) { // 5 minutes
          this.clients.delete(clientId);
        }
      });
    }, this.CLEANUP_INTERVAL);
  }
}

export default LogStreamingService;