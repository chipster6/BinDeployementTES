'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface AnalyticsData {
  timestamp: Date;
  type: 'metric' | 'event' | 'alert' | 'status';
  category: string;
  data: any;
  metadata?: Record<string, any>;
}

interface WebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  subscriptions?: string[];
}

interface UseAnalyticsWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  data: AnalyticsData | null;
  history: AnalyticsData[];
  connect: () => void;
  disconnect: () => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  sendMessage: (message: any) => void;
  clearHistory: () => void;
}

export default function useAnalyticsWebSocket(
  config: WebSocketConfig = {}
): UseAnalyticsWebSocketReturn {
  const {
    url = `ws://${window.location.hostname}:${window.location.port || 3000}/ws/analytics`,
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    subscriptions = ['metrics', 'events', 'alerts']
  } = config;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [history, setHistory] = useState<AnalyticsData[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedChannelsRef = useRef<Set<string>>(new Set(subscriptions));

  const clearTimeouts = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearTimeouts();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval, clearTimeouts]);

  const processMessage = useCallback((messageData: any) => {
    try {
      const parsedData = typeof messageData === 'string' ? JSON.parse(messageData) : messageData;
      
      // Handle different message types
      if (parsedData.type === 'pong') {
        // Heartbeat response - no action needed
        return;
      }

      const analyticsData: AnalyticsData = {
        timestamp: new Date(parsedData.timestamp || Date.now()),
        type: parsedData.type || 'metric',
        category: parsedData.category || 'general',
        data: parsedData.data || parsedData,
        metadata: parsedData.metadata || {}
      };

      setData(analyticsData);
      setHistory(prev => {
        const updated = [...prev, analyticsData];
        // Keep only last 100 messages to prevent memory issues
        return updated.slice(-100);
      });
    } catch (err) {
      console.error('Failed to process WebSocket message:', err);
      setError('Failed to process incoming data');
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setIsConnecting(true);
    setError(null);

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Subscribe to configured channels
        subscribedChannelsRef.current.forEach(channel => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'subscribe',
              channel,
              timestamp: Date.now()
            }));
          }
        });

        startHeartbeat();
        console.log('Analytics WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        processMessage(event.data);
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        clearTimeouts();

        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setError(`Connection lost. Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Maximum reconnection attempts reached. Please refresh the page.');
        }
      };

      wsRef.current.onerror = (event) => {
        setError('WebSocket connection error');
        setIsConnecting(false);
        console.error('Analytics WebSocket error:', event);
      };

    } catch (err) {
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
      console.error('WebSocket creation error:', err);
    }
  }, [url, maxReconnectAttempts, reconnectInterval, startHeartbeat, processMessage]);

  const disconnect = useCallback(() => {
    clearTimeouts();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, [clearTimeouts]);

  const subscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.add(channel);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channel,
        timestamp: Date.now()
      }));
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    subscribedChannelsRef.current.delete(channel);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel,
        timestamp: Date.now()
      }));
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
    } else {
      setError('Cannot send message: WebSocket not connected');
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setData(null);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [clearTimeouts]);

  return {
    isConnected,
    isConnecting,
    error,
    data,
    history,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
    clearHistory
  };
}