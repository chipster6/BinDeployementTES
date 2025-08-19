'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  MonitoringWebSocketEvent, 
  SecurityWebSocketEvent, 
  MLWebSocketEvent, 
  OperationsWebSocketEvent,
  MonitoringMetrics,
  Alert,
  SystemHealth,
  ComponentHealth 
} from '@/lib/types';

interface UseMonitoringWebSocketOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface MonitoringWebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  metrics: MonitoringMetrics | null;
  alerts: Alert[];
  systemHealth: SystemHealth | null;
  lastUpdate: string | null;
}

export function useMonitoringWebSocket(options: UseMonitoringWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10
  } = options;

  const [state, setState] = useState<MonitoringWebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    metrics: null,
    alerts: [],
    systemHealth: null,
    lastUpdate: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
      const ws = new WebSocket(`${wsUrl}/monitoring`);

      ws.onopen = () => {
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false, 
          error: null 
        }));
        reconnectAttemptsRef.current = 0;
        
        // Send authentication token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          ws.send(JSON.stringify({
            type: 'auth',
            token
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data: MonitoringWebSocketEvent | SecurityWebSocketEvent | MLWebSocketEvent | OperationsWebSocketEvent = JSON.parse(event.data);
          
          setState(prev => {
            const newState = { ...prev, lastUpdate: new Date().toISOString() };
            
            switch (data.type) {
              case 'metrics_update':
                newState.metrics = data.payload as MonitoringMetrics;
                break;
              case 'alert_fired':
                const newAlert = data.payload as Alert;
                newState.alerts = [newAlert, ...prev.alerts.filter(a => a.id !== newAlert.id)];
                break;
              case 'alert_resolved':
                const resolvedAlert = data.payload as Alert;
                newState.alerts = prev.alerts.map(alert => 
                  alert.id === resolvedAlert.id ? resolvedAlert : alert
                );
                break;
              case 'health_check_update':
                const componentHealth = data.payload as ComponentHealth;
                if (prev.systemHealth) {
                  newState.systemHealth = {
                    ...prev.systemHealth,
                    components: prev.systemHealth.components.map(comp =>
                      comp.name === componentHealth.name ? componentHealth : comp
                    ),
                    last_updated: new Date().toISOString()
                  };
                }
                break;
              default:
                console.log('Received unhandled monitoring event:', data.type);
            }
            
            return newState;
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: event.code !== 1000 ? `Connection closed unexpectedly (${event.code})` : null
        }));

        if (autoConnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: 'WebSocket connection error'
        }));
      };

      wsRef.current = ws;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Failed to create WebSocket connection'
      }));
    }
  }, [autoConnect, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false 
    }));
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Auto-connect on mount
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts
  };
}