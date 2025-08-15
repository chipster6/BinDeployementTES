"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(config: WebSocketConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Event | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const messageQueue = useRef<string[]>([]);

  const {
    url,
    protocols,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnected,
    onDisconnected,
    onError
  } = config;

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionState('connecting');
      setError(null);
      
      ws.current = new WebSocket(url, protocols);

      ws.current.onopen = () => {
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        
        // Send queued messages
        while (messageQueue.current.length > 0) {
          const message = messageQueue.current.shift();
          if (message && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(message);
          }
        }

        onConnected?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        setConnectionState('disconnected');
        ws.current = null;
        onDisconnected?.();

        // Attempt to reconnect if within retry limits
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval * Math.pow(1.5, reconnectAttempts.current - 1)); // Exponential backoff
        } else {
          console.warn('Max reconnection attempts reached');
        }
      };

      ws.current.onerror = (event) => {
        setError(event);
        setConnectionState('error');
        console.error('WebSocket error:', event);
        onError?.(event);
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setConnectionState('error');
    }
  }, [url, protocols, reconnectInterval, maxReconnectAttempts, onMessage, onConnected, onDisconnected, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
    setConnectionState('disconnected');
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(messageString);
    } else {
      // Queue message for when connection is established
      messageQueue.current.push(messageString);
      
      // Attempt to connect if not already connecting
      if (connectionState === 'disconnected') {
        connect();
      }
    }
  }, [connectionState, connect]);

  const manualReconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    error,
    sendMessage,
    disconnect,
    reconnect: manualReconnect,
    reconnectAttempts: reconnectAttempts.current
  };
}