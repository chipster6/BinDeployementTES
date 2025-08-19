"use client";

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import VirtualizedTable, { VirtualizedTableColumn } from '@/components/ui/virtualized-table';
import useOptimizedWebSocket from '@/hooks/useOptimizedWebSocket';
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface DatabaseConnection {
  id: string;
  database: string;
  status: 'active' | 'idle' | 'error';
  activeConnections: number;
  maxConnections: number;
  avgResponseTime: number;
  queriesPerSecond: number;
}

interface APIEndpoint {
  id: string;
  endpoint: string;
  method: string;
  avgResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  status: 'healthy' | 'warning' | 'critical';
}

// Memoized metric card component
const MetricCard = memo<{
  metric: PerformanceMetric;
  onClick?: (metric: PerformanceMetric) => void;
}>(({ metric, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(metric);
  }, [onClick, metric]);

  const statusConfig = useMemo(() => {
    switch (metric.status) {
      case 'healthy':
        return { color: 'bg-green-500', icon: CheckCircle, variant: 'default' as const };
      case 'warning':
        return { color: 'bg-yellow-500', icon: AlertTriangle, variant: 'secondary' as const };
      case 'critical':
        return { color: 'bg-red-500', icon: XCircle, variant: 'destructive' as const };
      default:
        return { color: 'bg-gray-500', icon: Activity, variant: 'outline' as const };
    }
  }, [metric.status]);

  const trendIcon = useMemo(() => {
    switch (metric.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  }, [metric.trend]);

  const progressValue = useMemo(() => {
    return Math.min((metric.value / metric.threshold) * 100, 100);
  }, [metric.value, metric.threshold]);

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow duration-200" 
      onClick={handleClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
        <div className="flex items-center space-x-2">
          {trendIcon}
          <Badge variant={statusConfig.variant}>{metric.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {metric.value.toLocaleString()} {metric.unit}
        </div>
        <Progress 
          value={progressValue} 
          className="mt-2"
          // @ts-ignore - Progress component accepts color prop
          color={statusConfig.color}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Threshold: {metric.threshold.toLocaleString()} {metric.unit}
        </p>
        <p className="text-xs text-muted-foreground">
          Updated: {new Date(metric.lastUpdated).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
});

MetricCard.displayName = 'MetricCard';

// Memoized database status component
const DatabaseStatus = memo<{
  connections: DatabaseConnection[];
  onRefresh?: () => void;
}>(({ connections, onRefresh }) => {
  const columns = useMemo<VirtualizedTableColumn<DatabaseConnection>[]>(() => [
    {
      id: 'database',
      header: 'Database',
      accessor: 'database',
      width: 120,
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      width: 100,
      render: (value) => {
        const config = {
          active: { color: 'bg-green-500', text: 'Active' },
          idle: { color: 'bg-yellow-500', text: 'Idle' },
          error: { color: 'bg-red-500', text: 'Error' }
        }[value] || { color: 'bg-gray-500', text: 'Unknown' };
        
        return (
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${config.color}`} />
            <span>{config.text}</span>
          </div>
        );
      }
    },
    {
      id: 'connections',
      header: 'Connections',
      accessor: (item) => `${item.activeConnections}/${item.maxConnections}`,
      width: 120,
      render: (value, item) => (
        <div className="space-y-1">
          <div>{value}</div>
          <Progress 
            value={(item.activeConnections / item.maxConnections) * 100} 
            className="h-1"
          />
        </div>
      )
    },
    {
      id: 'responseTime',
      header: 'Avg Response Time',
      accessor: 'avgResponseTime',
      width: 150,
      render: (value) => `${value}ms`
    },
    {
      id: 'qps',
      header: 'Queries/sec',
      accessor: 'queriesPerSecond',
      width: 120,
      render: (value) => value.toLocaleString()
    }
  ], []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Database Connections</span>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <VirtualizedTable
          data={connections}
          columns={columns}
          height={300}
          rowHeight={60}
          searchable={false}
          filterable={false}
          sortable={true}
        />
      </CardContent>
    </Card>
  );
});

DatabaseStatus.displayName = 'DatabaseStatus';

// Main performance dashboard component
export const PerformanceDashboard = memo<{
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}>(({ className, autoRefresh = true, refreshInterval = 30000 }) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [dbConnections, setDbConnections] = useState<DatabaseConnection[]>([]);
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // WebSocket connection for real-time updates
  const {
    isConnected: wsConnected,
    connectionState,
    sendMessage
  } = useOptimizedWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/performance',
    batchSize: 5,
    batchTimeout: 200,
    onBatchMessage: useCallback((messages) => {
      messages.forEach(message => {
        switch (message.type) {
          case 'performance_metrics':
            setMetrics(message.payload.metrics);
            break;
          case 'database_status':
            setDbConnections(message.payload.connections);
            break;
          case 'api_endpoints':
            setApiEndpoints(message.payload.endpoints);
            break;
        }
      });
      setLastRefresh(new Date());
    }, [])
  });

  // Fetch performance data
  const fetchPerformanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API calls - replace with actual API endpoints
      const [metricsRes, dbRes, apiRes] = await Promise.all([
        fetch('/api/performance/metrics'),
        fetch('/api/performance/database'),
        fetch('/api/performance/endpoints')
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics || []);
      }

      if (dbRes.ok) {
        const dbData = await dbRes.json();
        setDbConnections(dbData.connections || []);
      }

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        setApiEndpoints(apiData.endpoints || []);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoized metric summaries
  const metricSummary = useMemo(() => {
    const healthy = metrics.filter(m => m.status === 'healthy').length;
    const warning = metrics.filter(m => m.status === 'warning').length;
    const critical = metrics.filter(m => m.status === 'critical').length;
    const total = metrics.length;

    return { healthy, warning, critical, total };
  }, [metrics]);

  // Memoized API endpoints columns
  const apiColumns = useMemo<VirtualizedTableColumn<APIEndpoint>[]>(() => [
    {
      id: 'endpoint',
      header: 'Endpoint',
      accessor: 'endpoint',
      width: 200,
      render: (value, item) => (
        <div>
          <div className="font-medium">{value}</div>
          <Badge variant="outline" className="text-xs">{item.method}</Badge>
        </div>
      )
    },
    {
      id: 'responseTime',
      header: 'Avg Response Time',
      accessor: 'avgResponseTime',
      width: 150,
      sortable: true,
      render: (value) => `${value}ms`
    },
    {
      id: 'requestsPerMinute',
      header: 'Requests/min',
      accessor: 'requestsPerMinute',
      width: 120,
      sortable: true,
      render: (value) => value.toLocaleString()
    },
    {
      id: 'errorRate',
      header: 'Error Rate',
      accessor: 'errorRate',
      width: 100,
      sortable: true,
      render: (value) => `${(value * 100).toFixed(2)}%`
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      width: 100,
      render: (value) => {
        const config = {
          healthy: { variant: 'default' as const, text: 'Healthy' },
          warning: { variant: 'secondary' as const, text: 'Warning' },
          critical: { variant: 'destructive' as const, text: 'Critical' }
        }[value] || { variant: 'outline' as const, text: 'Unknown' };
        
        return <Badge variant={config.variant}>{config.text}</Badge>;
      }
    }
  ], []);

  // Auto-refresh effect
  useEffect(() => {
    fetchPerformanceData();

    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPerformanceData, autoRefresh, refreshInterval]);

  // Request real-time updates via WebSocket
  useEffect(() => {
    if (wsConnected) {
      sendMessage({ type: 'subscribe_performance' });
      return () => {
        sendMessage({ type: 'unsubscribe_performance' });
      };
    }
  }, [wsConnected, sendMessage]);

  const handleMetricClick = useCallback((metric: PerformanceMetric) => {
    console.log('Metric clicked:', metric);
    // Handle metric drill-down navigation
  }, []);

  const handleRefresh = useCallback(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4" />
            <Badge variant={wsConnected ? 'default' : 'destructive'}>
              {connectionState}
            </Badge>
          </div>
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Metrics summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{metricSummary.healthy}</div>
            <p className="text-sm text-muted-foreground">Healthy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{metricSummary.warning}</div>
            <p className="text-sm text-muted-foreground">Warning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{metricSummary.critical}</div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{metricSummary.total}</div>
            <p className="text-sm text-muted-foreground">Total Metrics</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            onClick={handleMetricClick}
          />
        ))}
      </div>

      {/* Database connections */}
      <DatabaseStatus 
        connections={dbConnections} 
        onRefresh={handleRefresh}
      />

      {/* API endpoints performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>API Endpoints Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VirtualizedTable
            data={apiEndpoints}
            columns={apiColumns}
            height={400}
            rowHeight={60}
            searchable={true}
            filterable={true}
            sortable={true}
            emptyMessage="No API endpoints data available"
          />
        </CardContent>
      </Card>
    </div>
  );
});

PerformanceDashboard.displayName = 'PerformanceDashboard';

export default PerformanceDashboard;