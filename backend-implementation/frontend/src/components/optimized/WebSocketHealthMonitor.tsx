"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { 
  Wifi, WifiOff, Activity, AlertCircle, CheckCircle, 
  RefreshCw, Zap, Clock, TrendingUp 
} from 'lucide-react';
import { useOptimizedWebSocket } from '@/hooks/useOptimizedWebSocket';

interface ConnectionMetrics {
  connectionId: string;
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'circuit-open';
  uptime: number;
  messagesReceived: number;
  messagesSent: number;
  reconnectAttempts: number;
  latency: number;
  lastActivity: number;
  errorCount: number;
  throughput: {
    messagesPerSecond: number;
    bytesPerSecond: number;
  };
}

interface WebSocketHealthMonitorProps {
  connections?: Array<{
    id: string;
    name: string;
    url: string;
    priority: 'high' | 'medium' | 'low';
    description?: string;
  }>;
  className?: string;
  onConnectionAction?: (action: string, connectionId: string) => void;
  enableAutoReconnect?: boolean;
  showDetailedMetrics?: boolean;
}

const ConnectionStatusIcon = memo<{ status: string }>(({ status }) => {
  const iconMap = {
    connecting: <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />,
    connected: <CheckCircle className="h-4 w-4 text-green-500" />,
    disconnected: <WifiOff className="h-4 w-4 text-gray-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    'circuit-open': <Zap className="h-4 w-4 text-orange-500" />
  };
  return iconMap[status] || <WifiOff className="h-4 w-4 text-gray-500" />;
});

ConnectionStatusIcon.displayName = 'ConnectionStatusIcon';

const ConnectionCard = memo<{
  connection: any;
  metrics: ConnectionMetrics;
  onAction?: (action: string, connectionId: string) => void;
  showDetailedMetrics?: boolean;
}>(({ connection, metrics, onAction, showDetailedMetrics }) => {
  const getStatusColor = (status: string) => {
    const colorMap = {
      connecting: 'bg-yellow-100 text-yellow-800',
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      'circuit-open': 'bg-orange-100 text-orange-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colorMap = {
      high: 'border-l-red-500 bg-red-50',
      medium: 'border-l-yellow-500 bg-yellow-50',
      low: 'border-l-green-500 bg-green-50'
    };
    return colorMap[priority] || 'border-l-gray-500 bg-gray-50';
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const formatLatency = (latency: number) => {
    if (latency < 50) return { value: latency, color: 'text-green-600', label: 'Excellent' };
    if (latency < 150) return { value: latency, color: 'text-yellow-600', label: 'Good' };
    if (latency < 300) return { value: latency, color: 'text-orange-600', label: 'Fair' };
    return { value: latency, color: 'text-red-600', label: 'Poor' };
  };

  const latencyInfo = formatLatency(metrics.latency);

  return (
    <Card className={cn(
      "border-l-4 transition-all duration-200 hover:shadow-md",
      getPriorityColor(connection.priority)
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ConnectionStatusIcon status={metrics.status} />
            <div>
              <CardTitle className="text-sm font-medium">{connection.name}</CardTitle>
              <p className="text-xs text-gray-500">{connection.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={cn("text-xs", getStatusColor(metrics.status))}>
              {metrics.status.replace('-', ' ').replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {connection.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Basic Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <div className="text-xs text-gray-500">Uptime</div>
            <div className="font-medium text-sm">{formatUptime(metrics.uptime)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Latency</div>
            <div className={cn("font-medium text-sm", latencyInfo.color)}>
              {latencyInfo.value}ms
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Messages</div>
            <div className="font-medium text-sm">
              {metrics.messagesReceived.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Errors</div>
            <div className={cn(
              "font-medium text-sm",
              metrics.errorCount > 0 ? "text-red-600" : "text-green-600"
            )}>
              {metrics.errorCount}
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        {showDetailedMetrics && (
          <div className="space-y-3 mb-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Connection Quality</span>
                <span>{latencyInfo.label}</span>
              </div>
              <Progress 
                value={Math.max(0, 100 - (metrics.latency / 5))} 
                className="h-2"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-500">Messages/sec</div>
                <div className="font-medium">{metrics.throughput.messagesPerSecond.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-gray-500">Data/sec</div>
                <div className="font-medium">
                  {(metrics.throughput.bytesPerSecond / 1024).toFixed(1)} KB/s
                </div>
              </div>
              <div>
                <div className="text-gray-500">Reconnects</div>
                <div className="font-medium">{metrics.reconnectAttempts}</div>
              </div>
              <div>
                <div className="text-gray-500">Last Activity</div>
                <div className="font-medium">
                  {new Date(metrics.lastActivity).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {metrics.status === 'disconnected' || metrics.status === 'error' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction?.('reconnect', connection.id)}
              className="text-xs h-7"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reconnect
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction?.('ping', connection.id)}
              className="text-xs h-7"
            >
              <Activity className="h-3 w-3 mr-1" />
              Ping
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction?.('details', connection.id)}
            className="text-xs h-7"
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

ConnectionCard.displayName = 'ConnectionCard';

export function WebSocketHealthMonitor({
  connections = [
    {
      id: 'bins',
      name: 'Bin Status Updates',
      url: '/bins',
      priority: 'high' as const,
      description: 'Real-time bin fill levels and status'
    },
    {
      id: 'routes',
      name: 'Route Tracking',
      url: '/routes',
      priority: 'high' as const,
      description: 'GPS tracking and route optimization'
    },
    {
      id: 'notifications',
      name: 'Notifications',
      url: '/notifications',
      priority: 'medium' as const,
      description: 'System alerts and user notifications'
    },
    {
      id: 'analytics',
      name: 'Analytics Stream',
      url: '/analytics',
      priority: 'low' as const,
      description: 'Performance metrics and insights'
    }
  ],
  className,
  onConnectionAction,
  enableAutoReconnect = true,
  showDetailedMetrics = false
}: WebSocketHealthMonitorProps) {
  const [metrics, setMetrics] = useState<Record<string, ConnectionMetrics>>({});
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');

  // Mock WebSocket connections (in real app, this would use actual connections)
  const connectionInstances = connections.map(conn => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}${conn.url}`;
    
    return useOptimizedWebSocket({
      url: wsUrl,
      heartbeatInterval: 30000,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      batchSize: 10,
      onMessage: (message) => {
        updateMetrics(conn.id, { messagesReceived: 1 });
      },
      onConnected: () => {
        updateMetrics(conn.id, { status: 'connected', errorCount: 0 });
      },
      onDisconnected: () => {
        updateMetrics(conn.id, { status: 'disconnected' });
      },
      onError: () => {
        updateMetrics(conn.id, { status: 'error', errorCount: 1 });
      }
    });
  });

  const updateMetrics = useCallback((connectionId: string, updates: Partial<ConnectionMetrics>) => {
    setMetrics(prev => {
      const current = prev[connectionId] || {
        connectionId,
        url: '',
        status: 'disconnected',
        uptime: 0,
        messagesReceived: 0,
        messagesSent: 0,
        reconnectAttempts: 0,
        latency: 0,
        lastActivity: Date.now(),
        errorCount: 0,
        throughput: { messagesPerSecond: 0, bytesPerSecond: 0 }
      };

      return {
        ...prev,
        [connectionId]: {
          ...current,
          ...updates,
          lastActivity: Date.now()
        }
      };
    });
  }, []);

  // Simulate metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      connections.forEach((conn, index) => {
        const instance = connectionInstances[index];
        const isConnected = instance.isConnected;
        
        updateMetrics(conn.id, {
          status: instance.connectionState,
          uptime: isConnected ? (metrics[conn.id]?.uptime || 0) + 1000 : 0,
          latency: isConnected ? Math.random() * 200 + 20 : 0,
          throughput: {
            messagesPerSecond: isConnected ? Math.random() * 10 : 0,
            bytesPerSecond: isConnected ? Math.random() * 1024 * 5 : 0
          }
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [connections, connectionInstances, metrics, updateMetrics]);

  // Calculate overall health
  useEffect(() => {
    const activeConnections = Object.values(metrics);
    const connectedCount = activeConnections.filter(m => m.status === 'connected').length;
    const totalCount = connections.length;
    
    if (connectedCount === totalCount) {
      setOverallHealth('healthy');
    } else if (connectedCount >= totalCount * 0.5) {
      setOverallHealth('degraded');
    } else {
      setOverallHealth('critical');
    }
  }, [metrics, connections.length]);

  const handleConnectionAction = useCallback((action: string, connectionId: string) => {
    const connectionIndex = connections.findIndex(c => c.id === connectionId);
    if (connectionIndex >= 0) {
      const instance = connectionInstances[connectionIndex];
      
      switch (action) {
        case 'reconnect':
          instance.reconnect();
          break;
        case 'ping':
          instance.sendMessage({ type: 'ping' }, 'high');
          break;
        case 'details':
          onConnectionAction?.(action, connectionId);
          break;
      }
    }
  }, [connections, connectionInstances, onConnectionAction]);

  const getOverallHealthColor = (health: string) => {
    const colorMap = {
      healthy: 'text-green-600 bg-green-100',
      degraded: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100'
    };
    return colorMap[health] || 'text-gray-600 bg-gray-100';
  };

  const connectedCount = Object.values(metrics).filter(m => m.status === 'connected').length;
  const totalMessages = Object.values(metrics).reduce((sum, m) => sum + m.messagesReceived, 0);
  const avgLatency = Object.values(metrics).reduce((sum, m) => sum + m.latency, 0) / Object.values(metrics).length || 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span>WebSocket Health Monitor</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={cn("text-xs", getOverallHealthColor(overallHealth))}>
              {overallHealth.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {connectedCount}/{connections.length} Connected
            </Badge>
          </div>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{connectedCount}</div>
            <div className="text-xs text-blue-500">Active Connections</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{totalMessages.toLocaleString()}</div>
            <div className="text-xs text-green-500">Total Messages</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-600">{avgLatency.toFixed(0)}ms</div>
            <div className="text-xs text-purple-500">Avg Latency</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">
              {Object.values(metrics).reduce((sum, m) => sum + m.errorCount, 0)}
            </div>
            <div className="text-xs text-orange-500">Total Errors</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((connection, index) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              metrics={metrics[connection.id] || {
                connectionId: connection.id,
                url: connection.url,
                status: 'disconnected',
                uptime: 0,
                messagesReceived: 0,
                messagesSent: 0,
                reconnectAttempts: 0,
                latency: 0,
                lastActivity: Date.now(),
                errorCount: 0,
                throughput: { messagesPerSecond: 0, bytesPerSecond: 0 }
              }}
              onAction={handleConnectionAction}
              showDetailedMetrics={showDetailedMetrics}
            />
          ))}
        </div>

        {/* Auto-reconnect Status */}
        {enableAutoReconnect && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-gray-500" />
                <span>Auto-reconnect enabled</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Max 5 attempts per connection
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WebSocketHealthMonitor;