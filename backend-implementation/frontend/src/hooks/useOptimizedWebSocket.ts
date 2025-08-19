"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export interface WebSocketMessage {
  id?: string;
  type: string;
  payload: any;
  timestamp: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  batchSize?: number;
  batchTimeout?: number;
  heartbeatInterval?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetTimeout?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onBatchMessage?: (messages: WebSocketMessage[]) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
  onCircuitBreakerOpen?: () => void;
  onCircuitBreakerClose?: () => void;
}

interface ConnectionPool {
  [key: string]: {
    ws: WebSocket;
    subscribers: Set<string>;
    lastActivity: number;
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
  };
}

interface MessageBatch {
  messages: WebSocketMessage[];
  timeout: NodeJS.Timeout;
}

type CircuitBreakerState = 'closed' | 'open' | 'half-open';

class WebSocketManager {
  private static instance: WebSocketManager;
  private connectionPool: ConnectionPool = {};
  private messageBatches: Map<string, MessageBatch> = new Map();
  private circuitBreakers: Map<string, {
    state: CircuitBreakerState;
    failures: number;
    lastFailure: number;
    threshold: number;
    resetTimeout: number;
  }> = new Map();

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  getConnection(url: string, config: WebSocketConfig, subscriberId: string): WebSocket | null {
    const circuitBreaker = this.circuitBreakers.get(url);
    
    // Check circuit breaker
    if (circuitBreaker && circuitBreaker.state === 'open') {
      if (Date.now() - circuitBreaker.lastFailure > circuitBreaker.resetTimeout) {
        circuitBreaker.state = 'half-open';
      } else {
        config.onCircuitBreakerOpen?.();
        return null;
      }
    }

    if (!this.connectionPool[url] || this.connectionPool[url].status === 'disconnected') {
      this.createConnection(url, config);
    }

    const connection = this.connectionPool[url];
    if (connection) {
      connection.subscribers.add(subscriberId);
      connection.lastActivity = Date.now();
    }

    return connection?.ws || null;
  }

  private createConnection(url: string, config: WebSocketConfig) {
    try {
      const ws = new WebSocket(url, config.protocols);
      
      this.connectionPool[url] = {
        ws,
        subscribers: new Set(),
        lastActivity: Date.now(),
        status: 'connecting'
      };

      ws.onopen = () => {
        console.log(`WebSocket connected: ${url}`);
        this.connectionPool[url].status = 'connected';
        this.resetCircuitBreaker(url);
        config.onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(url, message, config);
          this.connectionPool[url].lastActivity = Date.now();
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log(`WebSocket disconnected: ${url}`);
        this.connectionPool[url].status = 'disconnected';
        config.onDisconnected?.();
        this.triggerCircuitBreaker(url, config);
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error: ${url}`, error);
        this.connectionPool[url].status = 'error';
        config.onError?.(error);
        this.triggerCircuitBreaker(url, config);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.triggerCircuitBreaker(url, config);
    }
  }

  private handleMessage(url: string, message: WebSocketMessage, config: WebSocketConfig) {
    if (config.onBatchMessage && config.batchSize && config.batchSize > 1) {
      this.addToBatch(url, message, config);
    } else {
      config.onMessage?.(message);
    }
  }

  private addToBatch(url: string, message: WebSocketMessage, config: WebSocketConfig) {
    const batchKey = url;
    let batch = this.messageBatches.get(batchKey);

    if (!batch) {
      batch = {
        messages: [],
        timeout: setTimeout(() => this.flushBatch(batchKey, config), config.batchTimeout || 100)
      };
      this.messageBatches.set(batchKey, batch);
    }

    batch.messages.push(message);

    if (batch.messages.length >= (config.batchSize || 10)) {
      this.flushBatch(batchKey, config);
    }
  }

  private flushBatch(batchKey: string, config: WebSocketConfig) {
    const batch = this.messageBatches.get(batchKey);
    if (batch && batch.messages.length > 0) {
      clearTimeout(batch.timeout);
      config.onBatchMessage?.(batch.messages);
      this.messageBatches.delete(batchKey);
    }
  }

  private triggerCircuitBreaker(url: string, config: WebSocketConfig) {
    let circuitBreaker = this.circuitBreakers.get(url);
    
    if (!circuitBreaker) {
      circuitBreaker = {
        state: 'closed',
        failures: 0,
        lastFailure: 0,
        threshold: config.circuitBreakerThreshold || 5,
        resetTimeout: config.circuitBreakerResetTimeout || 30000
      };
      this.circuitBreakers.set(url, circuitBreaker);
    }

    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();

    if (circuitBreaker.failures >= circuitBreaker.threshold && circuitBreaker.state === 'closed') {
      circuitBreaker.state = 'open';
      config.onCircuitBreakerOpen?.();
      console.warn(`Circuit breaker opened for ${url}`);
    }
  }

  private resetCircuitBreaker(url: string) {
    const circuitBreaker = this.circuitBreakers.get(url);
    if (circuitBreaker) {
      circuitBreaker.state = 'closed';
      circuitBreaker.failures = 0;
      console.log(`Circuit breaker reset for ${url}`);
    }
  }

  removeSubscriber(url: string, subscriberId: string) {
    const connection = this.connectionPool[url];
    if (connection) {
      connection.subscribers.delete(subscriberId);
      
      // Close connection if no subscribers
      if (connection.subscribers.size === 0) {
        connection.ws.close();
        delete this.connectionPool[url];
        this.messageBatches.delete(url);
      }
    }
  }

  sendMessage(url: string, message: any, priority: 'high' | 'normal' | 'low' = 'normal') {
    const connection = this.connectionPool[url];
    if (connection && connection.status === 'connected') {
      const messageWithMetadata: WebSocketMessage = {
        id: Math.random().toString(36).substr(2, 9),
        type: message.type || 'message',
        payload: message,
        timestamp: new Date().toISOString(),
        priority
      };

      try {
        connection.ws.send(JSON.stringify(messageWithMetadata));
        connection.lastActivity = Date.now();
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    }
    return false;
  }

  getConnectionStatus(url: string): 'connecting' | 'connected' | 'disconnected' | 'error' | 'circuit-open' {
    const circuitBreaker = this.circuitBreakers.get(url);
    if (circuitBreaker && circuitBreaker.state === 'open') {
      return 'circuit-open';
    }
    
    return this.connectionPool[url]?.status || 'disconnected';
  }

  // Cleanup idle connections
  cleanup() {
    const now = Date.now();
    const idleTimeout = 5 * 60 * 1000; // 5 minutes

    Object.entries(this.connectionPool).forEach(([url, connection]) => {
      if (now - connection.lastActivity > idleTimeout && connection.subscribers.size === 0) {
        connection.ws.close();
        delete this.connectionPool[url];
        console.log(`Cleaned up idle connection: ${url}`);
      }
    });
  }
}

export function useOptimizedWebSocket(config: WebSocketConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'circuit-open'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [lastBatch, setLastBatch] = useState<WebSocketMessage[] | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const subscriberId = useRef(Math.random().toString(36).substr(2, 9));
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const managerRef = useRef(WebSocketManager.getInstance());

  const {
    url,
    protocols,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    onMessage,
    onBatchMessage,
    onConnected,
    onDisconnected,
    onError,
    onCircuitBreakerOpen,
    onCircuitBreakerClose
  } = config;

  // Enhanced config with optimized callbacks
  const optimizedConfig = useMemo(() => ({
    ...config,
    onMessage: (message: WebSocketMessage) => {
      setLastMessage(message);
      onMessage?.(message);
    },
    onBatchMessage: (messages: WebSocketMessage[]) => {
      setLastBatch(messages);
      onBatchMessage?.(messages);
    },
    onConnected: () => {
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
      setError(null);
      onConnected?.();
    },
    onDisconnected: () => {
      setIsConnected(false);
      setConnectionState('disconnected');
      onDisconnected?.();
      scheduleReconnect();
    },
    onError: (errorEvent: Event) => {
      setError(errorEvent);
      setConnectionState('error');
      onError?.(errorEvent);
    },
    onCircuitBreakerOpen: () => {
      setConnectionState('circuit-open');
      onCircuitBreakerOpen?.();
    },
    onCircuitBreakerClose: () => {
      setConnectionState('connected');
      onCircuitBreakerClose?.();
    }
  }), [config, onMessage, onBatchMessage, onConnected, onDisconnected, onError, onCircuitBreakerOpen, onCircuitBreakerClose]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = reconnectInterval * Math.pow(1.5, reconnectAttempts);
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        managerRef.current.getConnection(url, optimizedConfig, subscriberId.current);
      }, delay);
    }
  }, [reconnectAttempts, maxReconnectAttempts, reconnectInterval, url, optimizedConfig]);

  const connect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setConnectionState('connecting');
    managerRef.current.getConnection(url, optimizedConfig, subscriberId.current);
  }, [url, optimizedConfig]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    managerRef.current.removeSubscriber(url, subscriberId.current);
    setIsConnected(false);
    setConnectionState('disconnected');
    setReconnectAttempts(0);
  }, [url]);

  const sendMessage = useCallback((message: any, priority: 'high' | 'normal' | 'low' = 'normal') => {
    return managerRef.current.sendMessage(url, message, priority);
  }, [url]);

  const manualReconnect = useCallback(() => {
    setReconnectAttempts(0);
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Setup heartbeat
  useEffect(() => {
    if (isConnected && heartbeatInterval > 0) {
      heartbeatIntervalRef.current = setInterval(() => {
        sendMessage({ type: 'ping' }, 'high');
      }, heartbeatInterval);

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    }
  }, [isConnected, heartbeatInterval, sendMessage]);

  // Update connection state
  useEffect(() => {
    const checkConnection = () => {
      const status = managerRef.current.getConnectionStatus(url);
      setConnectionState(status);
      setIsConnected(status === 'connected');
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, [url]);

  // Initial connection
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    lastBatch,
    error,
    reconnectAttempts,
    sendMessage,
    disconnect,
    reconnect: manualReconnect,
    connectionManager: managerRef.current
  };
}

export default useOptimizedWebSocket;