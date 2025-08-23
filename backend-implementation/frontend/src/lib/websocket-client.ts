/**
 * ============================================================================
 * WEBSOCKET CLIENT FOR REAL-TIME MONITORING
 * ============================================================================
 * 
 * Comprehensive WebSocket client for real-time communication with the backend.
 * Provides type-safe WebSocket connections for monitoring, security, analytics,
 * and operational updates.
 * 
 * Features:
 * - Type-safe WebSocket event handling
 * - Automatic reconnection with exponential backoff
 * - Connection state management
 * - Message queuing during disconnection
 * - Heartbeat/ping-pong for connection health
 * - Multiple channel subscriptions
 * - Event handler management
 * - Error handling and logging
 * 
 * Created by: Frontend UI Specialist
 * Date: 2025-08-23
 * Version: 1.0.0
 */

import API_ENDPOINTS, { buildWebSocketUrl } from './api-endpoints';
import {
  WebSocketEvent,
  MonitoringWebSocketEvent,
  SecurityWebSocketEvent,
  MLWebSocketEvent,
  OperationsWebSocketEvent,
  RouteOptimizationWebSocketEvent,
  AnalyticsWebSocketEvent,
} from './types';

// WebSocket connection states
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

// WebSocket channels
export enum WebSocketChannel {
  MONITORING = 'monitoring',
  SECURITY = 'security',
  ANALYTICS = 'analytics',
  ROUTE_UPDATES = 'route-updates',
  BIN_UPDATES = 'bin-updates',
  ALERTS = 'alerts',
  ML_MODELS = 'ml-models',
  OPERATIONS = 'operations',
}

// Event handler type
export type WebSocketEventHandler<T = any> = (event: T) => void;

// Connection options
export interface WebSocketOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
}

// Default options
const DEFAULT_OPTIONS: Required<WebSocketOptions> = {
  autoReconnect: true,
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000, // 30 seconds
  messageQueueSize: 100,
};

/**
 * WebSocket connection manager for a specific channel
 */
class WebSocketConnection {
  private ws: WebSocket | null = null;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private url: string;
  private token: string | null = null;
  private options: Required<WebSocketOptions>;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private messageQueue: any[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;

  constructor(channel: WebSocketChannel, options: WebSocketOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.url = this.buildChannelUrl(channel);
  }

  private buildChannelUrl(channel: WebSocketChannel): string {
    switch (channel) {
      case WebSocketChannel.MONITORING:
        return buildWebSocketUrl(API_ENDPOINTS.WEBSOCKET.MONITORING);
      case WebSocketChannel.SECURITY:
        return buildWebSocketUrl(API_ENDPOINTS.WEBSOCKET.SECURITY);
      case WebSocketChannel.ANALYTICS:
        return buildWebSocketUrl(API_ENDPOINTS.WEBSOCKET.ANALYTICS);
      case WebSocketChannel.ROUTE_UPDATES:
        return buildWebSocketUrl(API_ENDPOINTS.WEBSOCKET.ROUTE_UPDATES);
      case WebSocketChannel.BIN_UPDATES:
        return buildWebSocketUrl(API_ENDPOINTS.WEBSOCKET.BIN_UPDATES);
      case WebSocketChannel.ALERTS:
        return buildWebSocketUrl(API_ENDPOINTS.WEBSOCKET.ALERTS);
      default:
        throw new Error(`Unknown WebSocket channel: ${channel}`);
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.state === WebSocketState.CONNECTING || this.state === WebSocketState.CONNECTED) {
      return;
    }

    this.setState(WebSocketState.CONNECTING);

    try {
      const url = this.token ? `${this.url}?token=${encodeURIComponent(this.token)}` : this.url;
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

    } catch (error) {
      this.setState(WebSocketState.ERROR);
      this.emitConnectionEvent('error', { error });
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.setState(WebSocketState.DISCONNECTING);
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState(WebSocketState.DISCONNECTED);
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): void {
    if (this.state === WebSocketState.CONNECTED && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(message);
      }
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  on(eventType: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off(eventType: string, handler?: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      return;
    }

    const handlers = this.eventHandlers.get(eventType)!;
    if (handler) {
      handlers.delete(handler);
    } else {
      handlers.clear();
    }

    if (handlers.size === 0) {
      this.eventHandlers.delete(eventType);
    }
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED;
  }

  // Private methods

  private setState(newState: WebSocketState): void {
    const oldState = this.state;
    this.state = newState;
    this.emitConnectionEvent('stateChange', { oldState, newState });
  }

  private handleOpen(): void {
    console.log('WebSocket connected:', this.url);
    this.setState(WebSocketState.CONNECTED);
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.flushMessageQueue();
    this.emitConnectionEvent('connected', {});
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle heartbeat/pong messages
      if (data.type === 'pong') {
        this.lastHeartbeat = Date.now();
        return;
      }

      // Emit event to handlers
      this.emitEvent(data.type, data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', this.url, event.code, event.reason);
    this.setState(WebSocketState.DISCONNECTED);
    this.ws = null;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.emitConnectionEvent('disconnected', { code: event.code, reason: event.reason });

    // Auto-reconnect if enabled and not intentionally closed
    if (this.options.autoReconnect && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', this.url, event);
    this.setState(WebSocketState.ERROR);
    this.emitConnectionEvent('error', { error: event });
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.state === WebSocketState.CONNECTED) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        
        // Check if we've missed heartbeats
        const now = Date.now();
        if (this.lastHeartbeat > 0 && now - this.lastHeartbeat > this.options.heartbeatInterval * 2) {
          console.warn('WebSocket heartbeat timeout, attempting reconnect');
          this.reconnect();
        }
      }
    }, this.options.heartbeatInterval);

    this.lastHeartbeat = Date.now();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emitConnectionEvent('maxReconnectAttemptsReached', {});
      return;
    }

    const delay = this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private async reconnect(): Promise<void> {
    try {
      await this.connect();
    } catch (error) {
      console.error('WebSocket reconnect failed:', error);
      this.scheduleReconnect();
    }
  }

  private queueMessage(message: any): void {
    if (this.messageQueue.length >= this.options.messageQueueSize) {
      this.messageQueue.shift(); // Remove oldest message
    }
    this.messageQueue.push(message);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws && this.state === WebSocketState.CONNECTED) {
      const message = this.messageQueue.shift();
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send queued message:', error);
        this.queueMessage(message); // Re-queue if failed
        break;
      }
    }
  }

  private emitEvent(eventType: string, data: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }

  private emitConnectionEvent(eventType: string, data: any): void {
    this.emitEvent(`connection:${eventType}`, data);
  }
}

/**
 * Main WebSocket client class
 */
export class WebSocketClient {
  private connections: Map<WebSocketChannel, WebSocketConnection> = new Map();
  private token: string | null = null;

  /**
   * Set authentication token for all connections
   */
  setToken(token: string): void {
    this.token = token;
    this.connections.forEach(connection => {
      connection.setToken(token);
    });
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Connect to a specific WebSocket channel
   */
  async connect(channel: WebSocketChannel, options?: WebSocketOptions): Promise<WebSocketConnection> {
    if (!this.connections.has(channel)) {
      const connection = new WebSocketConnection(channel, options);
      if (this.token) {
        connection.setToken(this.token);
      }
      this.connections.set(channel, connection);
    }

    const connection = this.connections.get(channel)!;
    await connection.connect();
    return connection;
  }

  /**
   * Disconnect from a specific channel
   */
  disconnect(channel: WebSocketChannel): void {
    const connection = this.connections.get(channel);
    if (connection) {
      connection.disconnect();
      this.connections.delete(channel);
    }
  }

  /**
   * Disconnect from all channels
   */
  disconnectAll(): void {
    this.connections.forEach((connection, channel) => {
      connection.disconnect();
    });
    this.connections.clear();
  }

  /**
   * Get connection for a specific channel
   */
  getConnection(channel: WebSocketChannel): WebSocketConnection | null {
    return this.connections.get(channel) || null;
  }

  /**
   * Check if connected to a specific channel
   */
  isConnected(channel: WebSocketChannel): boolean {
    const connection = this.connections.get(channel);
    return connection ? connection.isConnected() : false;
  }

  /**
   * Subscribe to monitoring events
   */
  onMonitoring(handler: WebSocketEventHandler<MonitoringWebSocketEvent>): void {
    this.connect(WebSocketChannel.MONITORING).then(connection => {
      connection.on('metrics_update', handler);
      connection.on('alert_fired', handler);
      connection.on('alert_resolved', handler);
      connection.on('health_check_update', handler);
    });
  }

  /**
   * Subscribe to security events
   */
  onSecurity(handler: WebSocketEventHandler<SecurityWebSocketEvent>): void {
    this.connect(WebSocketChannel.SECURITY).then(connection => {
      connection.on('threat_detected', handler);
      connection.on('incident_created', handler);
      connection.on('incident_updated', handler);
      connection.on('compliance_alert', handler);
    });
  }

  /**
   * Subscribe to analytics events
   */
  onAnalytics(handler: WebSocketEventHandler<AnalyticsWebSocketEvent>): void {
    this.connect(WebSocketChannel.ANALYTICS).then(connection => {
      connection.on('forecast_updated', handler);
      connection.on('metrics_computed', handler);
      connection.on('anomaly_detected', handler);
      connection.on('insight_generated', handler);
    });
  }

  /**
   * Subscribe to route optimization events
   */
  onRouteUpdates(handler: WebSocketEventHandler<RouteOptimizationWebSocketEvent>): void {
    this.connect(WebSocketChannel.ROUTE_UPDATES).then(connection => {
      connection.on('optimization_started', handler);
      connection.on('optimization_completed', handler);
      connection.on('route_updated', handler);
      connection.on('traffic_alert', handler);
    });
  }

  /**
   * Subscribe to bin update events
   */
  onBinUpdates(handler: WebSocketEventHandler<any>): void {
    this.connect(WebSocketChannel.BIN_UPDATES).then(connection => {
      connection.on('bin_status_changed', handler);
      connection.on('fill_level_updated', handler);
      connection.on('location_updated', handler);
      connection.on('service_scheduled', handler);
    });
  }

  /**
   * Subscribe to alert events
   */
  onAlerts(handler: WebSocketEventHandler<any>): void {
    this.connect(WebSocketChannel.ALERTS).then(connection => {
      connection.on('alert_created', handler);
      connection.on('alert_acknowledged', handler);
      connection.on('alert_resolved', handler);
      connection.on('alert_escalated', handler);
    });
  }

  /**
   * Subscribe to ML model events
   */
  onMLModels(handler: WebSocketEventHandler<MLWebSocketEvent>): void {
    this.connect(WebSocketChannel.ML_MODELS).then(connection => {
      connection.on('model_deployed', handler);
      connection.on('pipeline_completed', handler);
      connection.on('feature_flag_toggled', handler);
      connection.on('ab_test_updated', handler);
    });
  }

  /**
   * Subscribe to operations events
   */
  onOperations(handler: WebSocketEventHandler<OperationsWebSocketEvent>): void {
    this.connect(WebSocketChannel.OPERATIONS).then(connection => {
      connection.on('deployment_started', handler);
      connection.on('deployment_completed', handler);
      connection.on('service_status_changed', handler);
      connection.on('backup_completed', handler);
    });
  }
}

// Export singleton instance
export const webSocketClient = new WebSocketClient();
export { WebSocketConnection, WebSocketChannel, WebSocketState };
export default webSocketClient;