'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  MemoryStick,
  Network,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useMonitoringWebSocket } from '@/hooks/useMonitoringWebSocket';
import { apiClient } from '@/lib/api';
import { 
  SystemHealth, 
  Alert as AlertType, 
  MonitoringMetrics, 
  ComponentHealth 
} from '@/lib/types';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'healthy' | 'warning' | 'critical';
}

function MetricCard({ title, value, unit, icon, trend, trendValue, status = 'healthy' }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-green-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={getStatusColor()}>{icon}</div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">
                {value}
                {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
              </p>
            </div>
          </div>
          {trend && trendValue && (
            <div className="flex items-center space-x-1 text-sm">
              {getTrendIcon()}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SystemHealthIndicatorProps {
  health: SystemHealth;
}

function SystemHealthIndicator({ health }: SystemHealthIndicatorProps) {
  const getHealthStatus = (status: string) => {
    switch (status) {
      case 'healthy': return { color: 'bg-green-500', text: 'Healthy', icon: <CheckCircle className="h-4 w-4" /> };
      case 'degraded': return { color: 'bg-yellow-500', text: 'Degraded', icon: <AlertTriangle className="h-4 w-4" /> };
      case 'unhealthy': return { color: 'bg-red-500', text: 'Unhealthy', icon: <XCircle className="h-4 w-4" /> };
      default: return { color: 'bg-gray-500', text: 'Unknown', icon: <Activity className="h-4 w-4" /> };
    }
  };

  const healthStatus = getHealthStatus(health.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Server className="h-5 w-5" />
          <span>System Health</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${healthStatus.color}`} />
              <span className="font-medium">{healthStatus.text}</span>
              {healthStatus.icon}
            </div>
            <Badge variant="outline">v{health.version}</Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uptime</span>
              <span className="font-mono">{Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Components</h4>
            {health.components.map((component) => {
              const componentStatus = getHealthStatus(component.status);
              return (
                <div key={component.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`h-2 w-2 rounded-full ${componentStatus.color}`} />
                    <span>{component.name}</span>
                  </div>
                  <span className="text-gray-500 font-mono">{component.response_time}ms</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertsPanelProps {
  alerts: AlertType[];
  onAcknowledge: (alertId: string) => void;
  onSilence: (alertId: string) => void;
}

function AlertsPanel({ alerts, onAcknowledge, onSilence }: AlertsPanelProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Active Alerts</span>
          <Badge variant="secondary">{alerts.filter(a => a.status === 'firing').length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No active alerts</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{alert.alert_name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                        <Timer className="h-3 w-3" />
                        <span>{new Date(alert.started_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      Ack
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSilence(alert.id)}
                    >
                      Silence
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PerformanceMetricsProps {
  metrics: MonitoringMetrics | null;
}

function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3" />
            <p>Loading metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'healthy';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="CPU Usage"
        value={metrics.cpu_usage.toFixed(1)}
        unit="%"
        icon={<Cpu className="h-5 w-5" />}
        status={getPerformanceStatus(metrics.cpu_usage, { warning: 70, critical: 90 })}
      />
      <MetricCard
        title="Memory Usage"
        value={metrics.memory_usage.toFixed(1)}
        unit="%"
        icon={<MemoryStick className="h-5 w-5" />}
        status={getPerformanceStatus(metrics.memory_usage, { warning: 80, critical: 95 })}
      />
      <MetricCard
        title="Disk Usage"
        value={metrics.disk_usage.toFixed(1)}
        unit="%"
        icon={<HardDrive className="h-5 w-5" />}
        status={getPerformanceStatus(metrics.disk_usage, { warning: 85, critical: 95 })}
      />
      <MetricCard
        title="DB Connections"
        value={metrics.database_connections}
        icon={<Database className="h-5 w-5" />}
        status={getPerformanceStatus(metrics.database_connections, { warning: 80, critical: 100 })}
      />
      <MetricCard
        title="Active Sessions"
        value={metrics.active_sessions}
        icon={<Network className="h-5 w-5" />}
      />
      <MetricCard
        title="Error Rate"
        value={metrics.error_rate.toFixed(2)}
        unit="%"
        icon={<XCircle className="h-5 w-5" />}
        status={getPerformanceStatus(metrics.error_rate, { warning: 1, critical: 5 })}
      />
      <MetricCard
        title="Response Time"
        value={metrics.response_time.toFixed(0)}
        unit="ms"
        icon={<Timer className="h-5 w-5" />}
        status={getPerformanceStatus(metrics.response_time, { warning: 500, critical: 1000 })}
      />
      <MetricCard
        title="Network I/O"
        value={((metrics.network_io.bytes_in + metrics.network_io.bytes_out) / 1024 / 1024).toFixed(1)}
        unit="MB"
        icon={<Network className="h-5 w-5" />}
      />
    </div>
  );
}

export function MonitoringDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    isConnected,
    isConnecting,
    error: wsError,
    metrics,
    alerts,
    systemHealth: wsSystemHealth,
    lastUpdate,
    connect,
    disconnect
  } = useMonitoringWebSocket();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Update system health from WebSocket
  useEffect(() => {
    if (wsSystemHealth) {
      setSystemHealth(wsSystemHealth);
    }
  }, [wsSystemHealth]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [healthResponse, alertsResponse] = await Promise.all([
        apiClient.getSystemHealth(),
        apiClient.getAlerts('firing')
      ]);

      if (healthResponse.success && healthResponse.data) {
        setSystemHealth(healthResponse.data);
      }

    } catch (err) {
      setError('Failed to load monitoring data');
      console.error('Error loading monitoring data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await apiClient.acknowledgeAlert(alertId);
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleSilenceAlert = async (alertId: string) => {
    try {
      await apiClient.silenceAlert(alertId, 3600); // Silence for 1 hour
    } catch (err) {
      console.error('Error silencing alert:', err);
    }
  };

  const refresh = () => {
    loadInitialData();
    if (!isConnected) {
      connect();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-gray-600">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Last update: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
          <Button onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {(error || wsError) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || wsError}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {systemHealth && (
              <div className="lg:col-span-1">
                <SystemHealthIndicator health={systemHealth} />
              </div>
            )}
            <div className="lg:col-span-2">
              <AlertsPanel
                alerts={alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onSilence={handleSilenceAlert}
              />
            </div>
          </div>
          
          <PerformanceMetrics metrics={metrics} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics metrics={metrics} />
          
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resource Utilization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>CPU Usage</span>
                      <span>{metrics.cpu_usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.cpu_usage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Memory Usage</span>
                      <span>{metrics.memory_usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.memory_usage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Disk Usage</span>
                      <span>{metrics.disk_usage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.disk_usage} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Network Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm">Bytes In</span>
                    <span className="font-mono text-sm">
                      {(metrics.network_io.bytes_in / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Bytes Out</span>
                    <span className="font-mono text-sm">
                      {(metrics.network_io.bytes_out / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Sessions</span>
                    <span className="font-mono text-sm">{metrics.active_sessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">DB Connections</span>
                    <span className="font-mono text-sm">{metrics.database_connections}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertsPanel
            alerts={alerts}
            onAcknowledge={handleAcknowledgeAlert}
            onSilence={handleSilenceAlert}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}