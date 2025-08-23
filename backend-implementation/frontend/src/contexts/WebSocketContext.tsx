'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

// WebSocket event types
interface WebSocketMessage {
  type: string;
  channel: string;
  data: any;
  timestamp: string;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastConnected: Date | null;
  reconnectAttempts: number;
}

interface WebSocketContextType {
  connectionState: ConnectionState;
  subscribe: (channel: string, callback: (data: any) => void) => () => void;
  unsubscribe: (channel: string, callback?: (data: any) => void) => void;
  send: (channel: string, data: any) => void;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    lastConnected: null,
    reconnectAttempts: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const maxReconnectAttempts = parseInt(process.env.NEXT_PUBLIC_WEBSOCKET_MAX_RECONNECT_ATTEMPTS || '10');
  const reconnectInterval = parseInt(process.env.NEXT_PUBLIC_WEBSOCKET_RECONNECT_INTERVAL || '5000');
  const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001';

  // Subscribe to a channel
  const subscribe = (channel: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(channel)) {
      subscribersRef.current.set(channel, new Set());
    }
    subscribersRef.current.get(channel)!.add(callback);

    // Send subscription message if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channel: channel,
        timestamp: new Date().toISOString(),
      }));
    }

    // Return unsubscribe function
    return () => {
      subscribersRef.current.get(channel)?.delete(callback);
      if (subscribersRef.current.get(channel)?.size === 0) {
        subscribersRef.current.delete(channel);
        
        // Send unsubscribe message if connected
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'unsubscribe',
            channel: channel,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    };
  };

  // Unsubscribe from a channel
  const unsubscribe = (channel: string, callback?: (data: any) => void) => {
    if (callback) {
      subscribersRef.current.get(channel)?.delete(callback);
    } else {
      subscribersRef.current.delete(channel);
    }

    // Send unsubscribe message if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel: channel,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  // Send message to a channel
  const send = (channel: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        channel: channel,
        data: data,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  // Handle incoming messages
  const handleMessage = (event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle heartbeat/pong messages
      if (message.type === 'pong') {
        return;
      }

      // Route message to subscribers
      const subscribers = subscribersRef.current.get(message.channel);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(message.data);
          } catch (error) {
            console.error(`Error in WebSocket subscriber for channel ${message.channel}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  // Start heartbeat
  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString(),
        }));
      }
    }, 30000); // Heartbeat every 30 seconds
  };

  // Stop heartbeat
  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  // Connect to WebSocket
  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      // Get auth token for connection
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const wsUrlWithToken = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;

      wsRef.current = new WebSocket(wsUrlWithToken);

      wsRef.current.onopen = () => {
        setConnectionState({
          connected: true,
          connecting: false,
          error: null,
          lastConnected: new Date(),
          reconnectAttempts: 0,
        });

        startHeartbeat();

        // Resubscribe to all channels
        subscribersRef.current.forEach((_, channel) => {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            channel: channel,
            timestamp: new Date().toISOString(),
          }));
        });
      };

      wsRef.current.onmessage = handleMessage;

      wsRef.current.onclose = (event) => {
        setConnectionState(prev => ({
          ...prev,
          connected: false,
          connecting: false,
        }));

        stopHeartbeat();

        // Attempt reconnection if not intentional close
        if (event.code !== 1000 && connectionState.reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, connectionState.reconnectAttempts), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionState(prev => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1,
            }));
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState(prev => ({
          ...prev,
          error: 'Connection error',
          connecting: false,
        }));
      };

    } catch (error) {
      setConnectionState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Connection failed',
        connecting: false,
      }));
    }
  };

  // Disconnect from WebSocket
  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Intentional disconnect');
      wsRef.current = null;
    }

    setConnectionState({
      connected: false,
      connecting: false,
      error: null,
      lastConnected: null,
      reconnectAttempts: 0,
    });

    // Clear all subscribers
    subscribersRef.current.clear();
  };

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const value: WebSocketContextType = {
    connectionState,
    subscribe,
    unsubscribe,
    send,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Specialized hooks for different channels
export function useMonitoringWebSocket() {
  const { subscribe, unsubscribe } = useWebSocket();
  
  return {
    subscribeToSystemMetrics: (callback: (data: any) => void) => 
      subscribe('system-metrics', callback),
    subscribeToPerformanceAlerts: (callback: (data: any) => void) => 
      subscribe('performance-alerts', callback),
    subscribeToHealthStatus: (callback: (data: any) => void) => 
      subscribe('health-status', callback),
  };
}

export function useSecurityWebSocket() {
  const { subscribe, unsubscribe } = useWebSocket();
  
  return {
    subscribeToThreatAlerts: (callback: (data: any) => void) => 
      subscribe('threat-alerts', callback),
    subscribeToSecurityIncidents: (callback: (data: any) => void) => 
      subscribe('security-incidents', callback),
    subscribeToComplianceUpdates: (callback: (data: any) => void) => 
      subscribe('compliance-updates', callback),
  };
}

export function useAnalyticsWebSocket() {
  const { subscribe, unsubscribe } = useWebSocket();
  
  return {
    subscribeToRealtimeAnalytics: (callback: (data: any) => void) => 
      subscribe('realtime-analytics', callback),
    subscribeToRouteUpdates: (callback: (data: any) => void) => 
      subscribe('route-updates', callback),
    subscribeToFleetStatus: (callback: (data: any) => void) => 
      subscribe('fleet-status', callback),
  };
}

export function useExternalServicesWebSocket() {
  const { subscribe, unsubscribe } = useWebSocket();
  
  return {
    subscribeToServiceStatus: (callback: (data: any) => void) => 
      subscribe('external-service-status', callback),
    subscribeToCostAlerts: (callback: (data: any) => void) => 
      subscribe('cost-alerts', callback),
    subscribeToTrafficUpdates: (callback: (data: any) => void) => 
      subscribe('traffic-updates', callback),
  };
}