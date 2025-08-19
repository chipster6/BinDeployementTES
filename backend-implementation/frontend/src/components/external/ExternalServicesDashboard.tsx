'use client';

import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Server, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Shield,
  Zap,
  Clock,
  Activity,
  Gauge,
  AlertCircle,
  Settings,
  TestTube,
  ArrowRight,
  CreditCard,
  Mail,
  MessageSquare,
  Map,
  Users,
  FileText
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useCachedAPI } from '@/hooks/useCachedAPI';
import useOptimizedWebSocket from '@/hooks/useOptimizedWebSocket';
import VirtualizedTable, { VirtualizedTableColumn } from '@/components/ui/virtualized-table';
import { 
  ExternalServiceStatus, 
  ServiceCostMetrics, 
  FallbackStrategy,
  ServiceStatus 
} from '@/lib/types';

interface ServiceStatusCardProps {
  service: ExternalServiceStatus;
  onTest: (serviceName: string) => void;
}

const ServiceStatusCard = memo<ServiceStatusCardProps>(({ service, onTest }) => {
  const getStatusIcon = useCallback((status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.OPERATIONAL:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case ServiceStatus.DEGRADED:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case ServiceStatus.PARTIAL_OUTAGE:
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case ServiceStatus.MAJOR_OUTAGE:
        return <XCircle className="h-4 w-4 text-red-600" />;
      case ServiceStatus.MAINTENANCE:
        return <Settings className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  }, []);

  const getStatusColor = useCallback((status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.OPERATIONAL:
        return 'bg-green-100 text-green-800 border-green-200';
      case ServiceStatus.DEGRADED:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ServiceStatus.PARTIAL_OUTAGE:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case ServiceStatus.MAJOR_OUTAGE:
        return 'bg-red-100 text-red-800 border-red-200';
      case ServiceStatus.MAINTENANCE:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const getServiceIcon = useCallback((serviceName: string) => {
    switch (serviceName.toLowerCase()) {
      case 'stripe':
        return <CreditCard className="h-5 w-5" />;
      case 'twilio':
        return <MessageSquare className="h-5 w-5" />;
      case 'sendgrid':
        return <Mail className="h-5 w-5" />;
      case 'mapbox':
      case 'google_maps':
        return <Map className="h-5 w-5" />;
      case 'samsara':
        return <Users className="h-5 w-5" />;
      case 'airtable':
        return <FileText className="h-5 w-5" />;
      default:
        return <Server className="h-5 w-5" />;
    }
  }, []);

  const getImpactLevelColor = useCallback((impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gray-50">
              {getServiceIcon(service.service_name)}
            </div>
            <div>
              <CardTitle className="text-lg capitalize">{service.service_name}</CardTitle>
              <CardDescription>
                Last updated: {new Date(service.timestamp).toLocaleTimeString()}
              </CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(service.status)}>
            {getStatusIcon(service.status)}
            <span className="ml-1 capitalize">{service.status.replace('_', ' ')}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User-friendly message */}
        <div className="p-3 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-700">{service.user_friendly_message}</p>
        </div>

        {/* Technical details if available */}
        {service.technical_details && (
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              Technical Details
            </summary>
            <p className="mt-2 text-gray-700 font-mono text-xs bg-gray-100 p-2 rounded">
              {service.technical_details}
            </p>
          </details>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Response Time</span>
              <span className="font-mono">{service.response_time}ms</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Uptime</span>
              <span className="font-mono">{service.uptime.toFixed(2)}%</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Error Rate</span>
              <span className="font-mono">{service.error_rate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Impact Level</span>
              <span className={`capitalize font-medium ${getImpactLevelColor(service.impact_level)}`}>
                {service.impact_level}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bars for key metrics */}
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Uptime</span>
              <span>{service.uptime.toFixed(1)}%</span>
            </div>
            <Progress 
              value={service.uptime} 
              className={`h-2 ${service.uptime >= 99 ? '' : 'bg-red-100'}`}
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Performance</span>
              <span>{service.response_time < 500 ? 'Good' : service.response_time < 1000 ? 'Fair' : 'Poor'}</span>
            </div>
            <Progress 
              value={Math.max(0, 100 - (service.response_time / 10))} 
              className="h-2"
            />
          </div>
        </div>

        {/* Estimated resolution */}
        {service.estimated_resolution && (
          <div className="flex items-center space-x-2 text-sm p-2 bg-blue-50 rounded">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700">
              Estimated resolution: {service.estimated_resolution}
            </span>
          </div>
        )}

        {/* Workaround available */}
        {service.workaround_available && (
          <div className="flex items-center space-x-2 text-sm p-2 bg-green-50 rounded">
            <Zap className="h-4 w-4 text-green-600" />
            <span className="text-green-700">Workaround available</span>
          </div>
        )}

        {/* Dependent services */}
        {service.dependent_services.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Dependent Services</h4>
            <div className="flex flex-wrap gap-1">
              {service.dependent_services.map((dep) => (
                <Badge key={dep} variant="outline" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onTest(service.service_name)}
            className="flex-1"
          >
            <TestTube className="h-3 w-3 mr-2" />
            Test Service
          </Button>
          <Button size="sm" variant="outline">
            <Activity className="h-3 w-3 mr-2" />
            View Logs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

ServiceStatusCard.displayName = 'ServiceStatusCard';

interface CostMetricsTabProps {
  costMetrics: ServiceCostMetrics[];
  onRefresh: () => void;
}

function CostMetricsTab({ costMetrics, onRefresh }: CostMetricsTabProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getBudgetUsageColor = (current: number, budget: number) => {
    const percentage = (current / budget) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Cost Monitoring</h3>
          <p className="text-sm text-gray-600">Track spending and optimization opportunities</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {costMetrics.map((metric) => (
          <Card key={metric.service_name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base capitalize">{metric.service_name}</CardTitle>
                {getTrendIcon(metric.current_month_cost, metric.previous_month_cost)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Month</span>
                  <span className="font-semibold">{formatCurrency(metric.current_month_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Previous Month</span>
                  <span>{formatCurrency(metric.previous_month_cost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Budget</span>
                  <span className={getBudgetUsageColor(metric.current_month_cost, metric.budget_limit)}>
                    {formatCurrency(metric.budget_limit)}
                  </span>
                </div>
              </div>

              {/* Budget usage progress */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Budget Usage</span>
                  <span>{((metric.current_month_cost / metric.budget_limit) * 100).toFixed(1)}%</span>
                </div>
                <Progress 
                  value={(metric.current_month_cost / metric.budget_limit) * 100} 
                  className="h-2"
                />
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Usage Units</span>
                  <span className="font-mono">{metric.usage_units.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost per Unit</span>
                  <span className="font-mono">{formatCurrency(metric.cost_per_unit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Projected</span>
                  <span className="font-mono">{formatCurrency(metric.projected_month_cost)}</span>
                </div>
              </div>

              {/* Optimization opportunities */}
              {metric.optimization_opportunities.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      Potential Savings: {formatCurrency(
                        metric.optimization_opportunities.reduce((sum, opp) => sum + opp.potential_savings, 0)
                      )}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {metric.optimization_opportunities.slice(0, 2).map((opp, index) => (
                      <div key={index} className="text-xs p-2 bg-green-50 rounded">
                        <div className="font-medium">{opp.type}</div>
                        <div className="text-green-700">{opp.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost alerts */}
              {metric.alerts.length > 0 && (
                <div className="space-y-1">
                  {metric.alerts.map((alert, index) => (
                    <Alert key={index} className="py-2">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        {alert.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface FallbackStrategiesTabProps {
  strategies: FallbackStrategy[];
  onRefresh: () => void;
  onActivateFallback: (serviceName: string) => void;
  onDeactivateFallback: (serviceName: string) => void;
}

function FallbackStrategiesTab({ 
  strategies, 
  onRefresh, 
  onActivateFallback, 
  onDeactivateFallback 
}: FallbackStrategiesTabProps) {
  const getFallbackTypeIcon = (type: string) => {
    switch (type) {
      case 'cache':
        return <Server className="h-4 w-4 text-blue-500" />;
      case 'mock':
        return <TestTube className="h-4 w-4 text-green-500" />;
      case 'alternative_service':
        return <ArrowRight className="h-4 w-4 text-purple-500" />;
      case 'graceful_degradation':
        return <Shield className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFallbackTypeDescription = (type: string) => {
    switch (type) {
      case 'cache':
        return 'Serve cached responses when service is unavailable';
      case 'mock':
        return 'Return mock data for testing and development';
      case 'alternative_service':
        return 'Redirect requests to alternative service provider';
      case 'graceful_degradation':
        return 'Reduce functionality while maintaining core operations';
      default:
        return 'Custom fallback strategy';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Fallback Strategies</h3>
          <p className="text-sm text-gray-600">Manage service resilience and continuity</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((strategy) => (
          <Card key={strategy.service_name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getFallbackTypeIcon(strategy.fallback_type)}
                  <CardTitle className="text-base capitalize">
                    {strategy.service_name}
                  </CardTitle>
                </div>
                <Badge variant={strategy.active ? "default" : "outline"}>
                  {strategy.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardDescription className="capitalize">
                {strategy.fallback_type.replace('_', ' ')} Strategy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                {getFallbackTypeDescription(strategy.fallback_type)}
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">{strategy.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Success Rate</span>
                    <span className="font-mono">{strategy.success_rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={strategy.success_rate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Performance Impact</span>
                    <span className="font-mono">{strategy.performance_impact.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={100 - strategy.performance_impact} 
                    className="h-2"
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Automatic</span>
                  <Badge variant={strategy.automatic ? "default" : "outline"}>
                    {strategy.automatic ? "Yes" : "No"}
                  </Badge>
                </div>
                {strategy.activated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Activated</span>
                    <span>{new Date(strategy.activated_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                {strategy.active ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onDeactivateFallback(strategy.service_name)}
                    className="flex-1"
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button 
                    size="sm"
                    onClick={() => onActivateFallback(strategy.service_name)}
                    className="flex-1"
                  >
                    Activate
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export const ExternalServicesDashboard = memo(() => {
  // Use cached API hooks for optimized data fetching
  const {
    data: serviceStatuses = [],
    isLoading: statusesLoading,
    error: statusesError,
    refresh: refreshStatuses
  } = useCachedAPI<ExternalServiceStatus[]>('/api/external/services/status', undefined, {
    ttl: 30 * 1000, // 30 seconds for service status
    staleWhileRevalidate: true,
    backgroundRefresh: true,
    backgroundRefreshThreshold: 0.5
  });

  const {
    data: costMetrics = [],
    isLoading: costLoading,
    error: costError,
    refresh: refreshCost
  } = useCachedAPI<ServiceCostMetrics[]>('/api/external/services/cost-metrics', undefined, {
    ttl: 5 * 60 * 1000, // 5 minutes for cost metrics
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  const {
    data: fallbackStrategies = [],
    isLoading: fallbackLoading,
    error: fallbackError,
    refresh: refreshFallback
  } = useCachedAPI<FallbackStrategy[]>('/api/external/services/fallback-strategies', undefined, {
    ttl: 2 * 60 * 1000, // 2 minutes for fallback strategies
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  // WebSocket for real-time external services coordination
  const {
    isConnected: wsConnected,
    sendMessage
  } = useOptimizedWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL?.replace('performance', 'external') || 'ws://localhost:8080/external',
    batchSize: 8,
    batchTimeout: 400,
    onBatchMessage: useCallback((messages) => {
      messages.forEach(message => {
        switch (message.type) {
          case 'service_status_updated':
            refreshStatuses();
            break;
          case 'cost_metrics_updated':
            refreshCost();
            break;
          case 'fallback_strategy_updated':
            refreshFallback();
            break;
        }
      });
    }, [refreshStatuses, refreshCost, refreshFallback])
  });

  // Memoized computed values
  const { isLoading, error, operationalServices, totalCost, activeFallbacks } = useMemo(() => {
    const isLoading = statusesLoading || costLoading || fallbackLoading;
    const error = statusesError || costError || fallbackError;
    const operationalServices = serviceStatuses.filter(s => s.status === ServiceStatus.OPERATIONAL).length;
    const totalCost = costMetrics.reduce((sum, metric) => sum + metric.current_month_cost, 0);
    const activeFallbacks = fallbackStrategies.filter(s => s.active).length;

    return { isLoading, error, operationalServices, totalCost, activeFallbacks };
  }, [
    statusesLoading, costLoading, fallbackLoading,
    statusesError, costError, fallbackError,
    serviceStatuses, costMetrics, fallbackStrategies
  ]);

  // Optimized refresh function
  const loadAllData = useCallback(async () => {
    refreshStatuses();
    refreshCost();
    refreshFallback();
  }, [refreshStatuses, refreshCost, refreshFallback]);

  const handleTestService = useCallback(async (serviceName: string) => {
    try {
      const response = await apiClient.testExternalService(serviceName);
      if (response.success) {
        refreshStatuses();
      }
    } catch (err) {
      console.error('Error testing service:', err);
    }
  }, [refreshStatuses]);

  const handleActivateFallback = useCallback(async (serviceName: string) => {
    try {
      await apiClient.activateFallback(serviceName);
      refreshFallback();
    } catch (err) {
      console.error('Error activating fallback:', err);
    }
  }, [refreshFallback]);

  const handleDeactivateFallback = useCallback(async (serviceName: string) => {
    try {
      await apiClient.deactivateFallback(serviceName);
      refreshFallback();
    } catch (err) {
      console.error('Error deactivating fallback:', err);
    }
  }, [refreshFallback]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (wsConnected) {
      sendMessage({ type: 'subscribe_external_services' });
      return () => {
        sendMessage({ type: 'unsubscribe_external_services' });
      };
    }
  }, [wsConnected, sendMessage]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading external services data...</span>
        </div>
      </div>
    );
  }

  // Add WebSocket connection status to header
  const connectionStatusBadge = wsConnected ? (
    <Badge variant="default" className="flex items-center gap-1">
      <Activity className="h-3 w-3" />
      Real-time Connected
    </Badge>
  ) : (
    <Badge variant="destructive" className="flex items-center gap-1">
      <XCircle className="h-3 w-3" />
      Disconnected
    </Badge>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">External Services</h1>
          <p className="text-gray-600">Monitor API health, costs, and manage fallback strategies</p>
        </div>
        <div className="flex items-center space-x-4">
          {connectionStatusBadge}
          <Button variant="outline" onClick={loadAllData}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{operationalServices}/{serviceStatuses.length}</div>
              <div className="text-gray-600">Operational</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                ${totalCost.toFixed(0)}
              </div>
              <div className="text-gray-600">Monthly Cost</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{activeFallbacks}</div>
              <div className="text-gray-600">Active Fallbacks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Service Status</TabsTrigger>
          <TabsTrigger value="costs">Cost Monitoring</TabsTrigger>
          <TabsTrigger value="fallbacks">Fallback Strategies</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceStatuses.map((service) => (
              <ServiceStatusCard
                key={service.service_name}
                service={service}
                onTest={handleTestService}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="costs">
          <CostMetricsTab
            costMetrics={costMetrics}
            onRefresh={loadAllData}
          />
        </TabsContent>

        <TabsContent value="fallbacks">
          <FallbackStrategiesTab
            strategies={fallbackStrategies}
            onRefresh={loadAllData}
            onActivateFallback={handleActivateFallback}
            onDeactivateFallback={handleDeactivateFallback}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});

ExternalServicesDashboard.displayName = 'ExternalServicesDashboard';