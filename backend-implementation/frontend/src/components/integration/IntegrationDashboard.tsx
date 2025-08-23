'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket, useMonitoringWebSocket, useAnalyticsWebSocket } from '@/contexts/WebSocketContext';
import { apiClient } from '@/lib/api';
import { CheckCircle, XCircle, Loader2, Wifi, WifiOff, Server, Database, Activity } from 'lucide-react';

interface SystemStatus {
  api: 'connected' | 'disconnected' | 'checking';
  database: 'healthy' | 'unhealthy' | 'checking';
  websocket: 'connected' | 'disconnected' | 'connecting';
  services: 'operational' | 'degraded' | 'down' | 'checking';
}

interface LiveMetrics {
  activeUsers: number;
  requestsPerMinute: number;
  responseTime: number;
  errorRate: number;
  lastUpdated: Date;
}

export function IntegrationDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { connectionState } = useWebSocket();
  const { subscribeToSystemMetrics, subscribeToHealthStatus } = useMonitoringWebSocket();
  const { subscribeToRealtimeAnalytics } = useAnalyticsWebSocket();

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    api: 'checking',
    database: 'checking',
    websocket: 'disconnected',
    services: 'checking',
  });

  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    activeUsers: 0,
    requestsPerMinute: 0,
    responseTime: 0,
    errorRate: 0,
    lastUpdated: new Date(),
  });

  const [lastApiTest, setLastApiTest] = useState<Date | null>(null);
  const [apiTestResult, setApiTestResult] = useState<string>('');

  // Test API connectivity
  const testApiConnectivity = async () => {
    setSystemStatus(prev => ({ ...prev, api: 'checking' }));
    try {
      const response = await apiClient.getHealth();
      if (response.success) {
        setSystemStatus(prev => ({ ...prev, api: 'connected' }));
        setApiTestResult('API connection successful');
      } else {
        setSystemStatus(prev => ({ ...prev, api: 'disconnected' }));
        setApiTestResult('API connection failed');
      }
    } catch (error) {
      setSystemStatus(prev => ({ ...prev, api: 'disconnected' }));
      setApiTestResult(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLastApiTest(new Date());
    }
  };

  // Check system health
  const checkSystemHealth = async () => {
    setSystemStatus(prev => ({ ...prev, database: 'checking', services: 'checking' }));
    try {
      const [healthResponse] = await Promise.all([
        apiClient.getHealth(),
      ]);

      if (healthResponse.success && healthResponse.data) {
        const health = healthResponse.data;
        setSystemStatus(prev => ({
          ...prev,
          database: health.database?.status === 'healthy' ? 'healthy' : 'unhealthy',
          services: health.services?.status === 'operational' ? 'operational' : 
                   health.services?.status === 'degraded' ? 'degraded' : 'down',
        }));
      }
    } catch (error) {
      setSystemStatus(prev => ({
        ...prev,
        database: 'unhealthy',
        services: 'down',
      }));
    }
  };

  // Update WebSocket status
  useEffect(() => {
    if (connectionState.connected) {
      setSystemStatus(prev => ({ ...prev, websocket: 'connected' }));
    } else if (connectionState.connecting) {
      setSystemStatus(prev => ({ ...prev, websocket: 'connecting' }));
    } else {
      setSystemStatus(prev => ({ ...prev, websocket: 'disconnected' }));
    }
  }, [connectionState]);

  // Subscribe to real-time metrics
  useEffect(() => {
    if (!connectionState.connected) return;

    const unsubscribeMetrics = subscribeToSystemMetrics((data) => {
      if (data.type === 'system_metrics') {
        setLiveMetrics(prev => ({
          ...prev,
          activeUsers: data.activeUsers || prev.activeUsers,
          requestsPerMinute: data.requestsPerMinute || prev.requestsPerMinute,
          responseTime: data.responseTime || prev.responseTime,
          errorRate: data.errorRate || prev.errorRate,
          lastUpdated: new Date(),
        }));
      }
    });

    const unsubscribeAnalytics = subscribeToRealtimeAnalytics((data) => {
      if (data.type === 'analytics_update') {
        setLiveMetrics(prev => ({ ...prev, ...data.metrics, lastUpdated: new Date() }));
      }
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeAnalytics();
    };
  }, [connectionState.connected, subscribeToSystemMetrics, subscribeToRealtimeAnalytics]);

  // Initial health check
  useEffect(() => {
    testApiConnectivity();
    checkSystemHealth();
  }, []);

  // Status badge component
  const StatusBadge = ({ status, successText, failText, checkingText }: {
    status: string;
    successText: string;
    failText: string;
    checkingText: string;
  }) => {
    if (status === 'checking' || status === 'connecting') {
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />{checkingText}</Badge>;
    }
    if (status === 'connected' || status === 'healthy' || status === 'operational') {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />{successText}
      </Badge>;
    }
    if (status === 'degraded') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
        <Activity className="w-3 h-3 mr-1" />Degraded
      </Badge>;
    }
    return <Badge variant="destructive">
      <XCircle className="w-3 h-3 mr-1" />{failText}
    </Badge>;
  };

  if (authLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading authentication...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Frontend-Backend Integration Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time connectivity and system status monitoring
        </p>
      </div>

      {/* Authentication Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated ? (
            <Alert>
              <AlertDescription>
                Not authenticated. Please log in to test full integration features.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">User</p>
                <p className="text-lg">{user?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Role</p>
                <Badge>{user?.role || 'Unknown'}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Organization</p>
                <p className="text-sm text-muted-foreground">{user?.organizationId || 'None'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Status
          </CardTitle>
          <CardDescription>
            Real-time status of all system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <Server className="w-8 h-8 mx-auto text-muted-foreground" />
              <h3 className="font-medium">API Server</h3>
              <StatusBadge 
                status={systemStatus.api}
                successText="Connected"
                failText="Disconnected"
                checkingText="Checking"
              />
            </div>
            
            <div className="text-center space-y-2">
              <Database className="w-8 h-8 mx-auto text-muted-foreground" />
              <h3 className="font-medium">Database</h3>
              <StatusBadge 
                status={systemStatus.database}
                successText="Healthy"
                failText="Unhealthy"
                checkingText="Checking"
              />
            </div>

            <div className="text-center space-y-2">
              {connectionState.connected ? 
                <Wifi className="w-8 h-8 mx-auto text-muted-foreground" /> :
                <WifiOff className="w-8 h-8 mx-auto text-muted-foreground" />
              }
              <h3 className="font-medium">WebSocket</h3>
              <StatusBadge 
                status={systemStatus.websocket}
                successText="Connected"
                failText="Disconnected"
                checkingText="Connecting"
              />
            </div>

            <div className="text-center space-y-2">
              <Activity className="w-8 h-8 mx-auto text-muted-foreground" />
              <h3 className="font-medium">Services</h3>
              <StatusBadge 
                status={systemStatus.services}
                successText="Operational"
                failText="Down"
                checkingText="Checking"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button onClick={testApiConnectivity} variant="outline" size="sm">
              Test API
            </Button>
            <Button onClick={checkSystemHealth} variant="outline" size="sm">
              Check Health
            </Button>
          </div>

          {lastApiTest && (
            <div className="mt-4 p-3 bg-muted rounded text-sm">
              <p><strong>Last API Test:</strong> {lastApiTest.toLocaleTimeString()}</p>
              <p><strong>Result:</strong> {apiTestResult}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Live System Metrics</CardTitle>
          <CardDescription>
            Real-time metrics updated via WebSocket
            {connectionState.connected && 
              <Badge variant="secondary" className="ml-2">Live</Badge>
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{liveMetrics.activeUsers}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{liveMetrics.requestsPerMinute}</p>
              <p className="text-sm text-muted-foreground">Requests/min</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{liveMetrics.responseTime}ms</p>
              <p className="text-sm text-muted-foreground">Response Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{(liveMetrics.errorRate * 100).toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Error Rate</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Last updated: {liveMetrics.lastUpdated.toLocaleTimeString()}
          </p>
        </CardContent>
      </Card>

      {/* Connection Details */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL}</p>
              <p><strong>WebSocket URL:</strong> {process.env.NEXT_PUBLIC_WEBSOCKET_URL}</p>
              <p><strong>Environment:</strong> {process.env.NEXT_PUBLIC_APP_ENVIRONMENT}</p>
            </div>
            <div>
              <p><strong>Reconnect Attempts:</strong> {connectionState.reconnectAttempts}</p>
              <p><strong>Last Connected:</strong> {connectionState.lastConnected?.toLocaleString() || 'Never'}</p>
              <p><strong>Connection Error:</strong> {connectionState.error || 'None'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}