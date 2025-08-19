'use client';

/**
 * ============================================================================
 * ROUTE COST MONITORING DASHBOARD
 * ============================================================================
 * 
 * Comprehensive cost monitoring dashboard specifically designed for route
 * optimization services. Tracks API costs, provides budget management,
 * and offers optimization recommendations.
 * 
 * Features:
 * - Real-time cost tracking for all external routing services
 * - Budget alerts with configurable thresholds
 * - Cost optimization recommendations with potential savings
 * - Historical cost analysis and trending
 * - Service-specific cost breakdown with detailed metrics
 * - Automated cost alerts and notifications
 * - Interactive cost projection and planning tools
 * 
 * Integration Points:
 * - ExternalServicesDashboard: Cost metrics and service health
 * - GraphHopper Service: API usage and cost tracking
 * - CostOptimizationService: Optimization recommendations
 * - Real-time WebSocket: Live cost updates and alerts
 * 
 * Created by: Frontend-Agent (Cost Monitoring Integration)
 * Date: 2025-08-19
 * Version: 1.0.0
 */

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  PieChart,
  Calendar,
  Settings,
  Target,
  Zap,
  ArrowRight,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { useCachedAPI } from '@/hooks/useCachedAPI';
import useOptimizedWebSocket from '@/hooks/useOptimizedWebSocket';

// Type definitions for cost monitoring
export interface ServiceCostBreakdown {
  serviceName: string;
  provider: string;
  displayName: string;
  requests: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
  };
  costs: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    projected: number;
  };
  metrics: {
    averageCostPerRequest: number;
    averageResponseTime: number;
    errorRate: number;
    successRate: number;
  };
  budget: {
    dailyLimit: number;
    monthlyLimit: number;
    remainingDaily: number;
    remainingMonthly: number;
  };
  trends: {
    costTrend: 'increasing' | 'decreasing' | 'stable';
    usageTrend: 'increasing' | 'decreasing' | 'stable';
    percentChange: number;
  };
}

export interface CostAlert {
  id: string;
  service: string;
  alertType: 'budget_exceeded' | 'cost_spike' | 'quota_warning' | 'anomaly_detected';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  recommendations: string[];
  timestamp: Date;
  acknowledged: boolean;
}

export interface CostOptimizationRecommendation {
  id: string;
  service: string;
  type: 'provider_switch' | 'caching_improvement' | 'batch_optimization' | 'usage_reduction';
  title: string;
  description: string;
  potentialSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  estimatedTimeToSave: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
}

export interface BudgetConfiguration {
  service: string;
  dailyLimit: number;
  monthlyLimit: number;
  alertThresholds: {
    warning: number; // percentage
    critical: number; // percentage
  };
  autoOptimization: boolean;
}

interface RouteCostMonitoringDashboardProps {
  organizationId?: string;
  timeRange?: '1d' | '7d' | '30d' | '90d';
  enableRealTime?: boolean;
  showAdvancedMetrics?: boolean;
  onOptimizationApplied?: (recommendationId: string) => void;
}

/**
 * Cost Metric Card Component
 */
const CostMetricCard = memo<{
  title: string;
  value: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  format?: 'currency' | 'number' | 'percentage';
  color?: 'default' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
}>(({ 
  title, 
  value, 
  trend, 
  trendValue, 
  format = 'currency', 
  color = 'default',
  icon 
}) => {
  const formatValue = (val: number, fmt: string) => {
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'number':
        return val.toLocaleString();
      default:
        return val.toString();
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-green-500" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const getCardColor = () => {
    switch (color) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <Card className={getCardColor()}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {icon}
            <span className="text-sm font-medium text-gray-600">{title}</span>
          </div>
          {trend && trendValue !== undefined && (
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className="text-xs text-gray-500">
                {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className="text-2xl font-bold">{formatValue(value, format)}</div>
      </CardContent>
    </Card>
  );
});

CostMetricCard.displayName = 'CostMetricCard';

/**
 * Service Cost Table Component
 */
const ServiceCostTable = memo<{
  services: ServiceCostBreakdown[];
  onServiceClick?: (service: ServiceCostBreakdown) => void;
}>(({ services, onServiceClick }) => {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const getBudgetUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTrendIcon = (trend: string, percentChange: number) => {
    if (trend === 'increasing') {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (trend === 'decreasing') {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead className="text-right">Today</TableHead>
            <TableHead className="text-right">This Month</TableHead>
            <TableHead className="text-right">Projected</TableHead>
            <TableHead className="text-right">Budget Usage</TableHead>
            <TableHead className="text-right">Trend</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow 
              key={service.serviceName} 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => onServiceClick?.(service)}
            >
              <TableCell>
                <div className="flex flex-col">
                  <div className="font-medium">{service.displayName}</div>
                  <div className="text-sm text-gray-500">{service.provider}</div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col">
                  <span className="font-medium">{formatCurrency(service.costs.today)}</span>
                  <span className="text-xs text-gray-500">{service.requests.today} requests</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col">
                  <span className="font-medium">{formatCurrency(service.costs.thisMonth)}</span>
                  <span className="text-xs text-gray-500">{service.requests.thisMonth} requests</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-medium">{formatCurrency(service.costs.projected)}</span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col">
                  <span className={`font-medium ${getBudgetUsageColor(service.costs.thisMonth, service.budget.monthlyLimit)}`}>
                    {((service.costs.thisMonth / service.budget.monthlyLimit) * 100).toFixed(1)}%
                  </span>
                  <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      className={`h-1 rounded-full ${
                        (service.costs.thisMonth / service.budget.monthlyLimit) * 100 >= 90 ? 'bg-red-500' :
                        (service.costs.thisMonth / service.budget.monthlyLimit) * 100 >= 75 ? 'bg-orange-500' :
                        (service.costs.thisMonth / service.budget.monthlyLimit) * 100 >= 50 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((service.costs.thisMonth / service.budget.monthlyLimit) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  {getTrendIcon(service.trends.costTrend, service.trends.percentChange)}
                  <span className="text-sm">
                    {service.trends.percentChange > 0 ? '+' : ''}{service.trends.percentChange.toFixed(1)}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

ServiceCostTable.displayName = 'ServiceCostTable';

/**
 * Cost Optimization Recommendations Panel
 */
const OptimizationRecommendationsPanel = memo<{
  recommendations: CostOptimizationRecommendation[];
  onApplyRecommendation: (id: string) => void;
}>(({ recommendations, onApplyRecommendation }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'provider_switch': return <ArrowRight className="h-4 w-4 text-blue-600" />;
      case 'caching_improvement': return <Clock className="h-4 w-4 text-green-600" />;
      case 'batch_optimization': return <BarChart3 className="h-4 w-4 text-purple-600" />;
      case 'usage_reduction': return <TrendingDown className="h-4 w-4 text-orange-600" />;
      default: return <Settings className="h-4 w-4 text-gray-600" />;
    }
  };

  const totalSavings = recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Optimization Recommendations</h3>
          <p className="text-sm text-gray-600">
            Potential monthly savings: <span className="font-semibold text-green-600">
              ${totalSavings.toFixed(0)}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec) => (
          <Card key={rec.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    {getTypeIcon(rec.type)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{rec.title}</CardTitle>
                    <CardDescription className="capitalize">{rec.service}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getPriorityColor(rec.priority)}>
                    {rec.priority} priority
                  </Badge>
                  <Badge variant="outline">
                    {rec.confidence}% confidence
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">{rec.description}</p>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Potential Savings</div>
                  <div className="text-lg font-semibold text-green-600">
                    ${rec.potentialSavings.toFixed(0)}/month
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Implementation Effort</div>
                  <div className={`capitalize font-semibold ${getEffortColor(rec.implementationEffort)}`}>
                    {rec.implementationEffort}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Time to Save</div>
                  <div className="font-semibold">{rec.estimatedTimeToSave}</div>
                </div>
              </div>

              {/* Confidence indicator */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Confidence Level</span>
                  <span>{rec.confidence}%</span>
                </div>
                <Progress value={rec.confidence} className="h-2" />
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onApplyRecommendation(rec.id)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Apply Optimization
                </Button>
                <div className="text-xs text-gray-500">
                  ID: {rec.id.slice(-8)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

OptimizationRecommendationsPanel.displayName = 'OptimizationRecommendationsPanel';

/**
 * Cost Alerts Panel
 */
const CostAlertsPanel = memo<{
  alerts: CostAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  onDismissAlert: (alertId: string) => void;
}>(({ alerts, onAcknowledgeAlert, onDismissAlert }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const activeAlerts = alerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Cost Alerts</h3>
          <p className="text-sm text-gray-600">
            {activeAlerts.length} active alerts, {acknowledgedAlerts.length} acknowledged
          </p>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium">Active Alerts</h4>
          {activeAlerts.map((alert) => (
            <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
              <div className="flex items-start space-x-3">
                {getSeverityIcon(alert.severity)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium capitalize">{alert.service}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <AlertDescription className="mb-3">
                    {alert.message}
                  </AlertDescription>
                  
                  {alert.alertType === 'budget_exceeded' && (
                    <div className="text-sm mb-3">
                      <div className="flex justify-between">
                        <span>Current: ${alert.currentValue.toFixed(2)}</span>
                        <span>Threshold: ${alert.threshold.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {alert.recommendations.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium mb-1">Recommendations:</div>
                      <ul className="text-sm space-y-1">
                        {alert.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-gray-500">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onAcknowledgeAlert(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Acknowledge
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => onDismissAlert(alert.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium">Recently Acknowledged</h4>
          {acknowledgedAlerts.slice(0, 3).map((alert) => (
            <Card key={alert.id} className="opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium capitalize">{alert.service}</div>
                    <div className="text-sm text-gray-600">{alert.message}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No alerts state */}
      {alerts.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">No cost alerts at this time</p>
          <p className="text-sm text-gray-500">All services are within budget limits</p>
        </div>
      )}
    </div>
  );
});

CostAlertsPanel.displayName = 'CostAlertsPanel';

/**
 * Main Route Cost Monitoring Dashboard
 */
export const RouteCostMonitoringDashboard = memo<RouteCostMonitoringDashboardProps>(({
  organizationId = 'default',
  timeRange = '30d',
  enableRealTime = true,
  showAdvancedMetrics = true,
  onOptimizationApplied
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [serviceCosts, setServiceCosts] = useState<ServiceCostBreakdown[]>([]);
  const [costAlerts, setCostAlerts] = useState<CostAlert[]>([]);
  const [optimizationRecs, setOptimizationRecs] = useState<CostOptimizationRecommendation[]>([]);

  // Data fetching
  const {
    data: costData,
    isLoading: isLoadingCosts,
    error: costError,
    refresh: refreshCosts
  } = useCachedAPI<{
    services: ServiceCostBreakdown[];
    totalCosts: {
      today: number;
      thisMonth: number;
      projected: number;
      budget: number;
    };
    trends: {
      dailyTrend: number;
      monthlyTrend: number;
    };
  }>(`/api/route-optimization/cost-breakdown?timeRange=${selectedTimeRange}`, undefined, {
    ttl: 300000, // 5 minutes
    staleWhileRevalidate: true,
    backgroundRefresh: enableRealTime
  });

  const {
    data: alertsData,
    isLoading: isLoadingAlerts,
    refresh: refreshAlerts
  } = useCachedAPI<CostAlert[]>('/api/route-optimization/cost-alerts', undefined, {
    ttl: 60000, // 1 minute
    staleWhileRevalidate: true,
    backgroundRefresh: enableRealTime
  });

  const {
    data: recommendationsData,
    isLoading: isLoadingRecs,
    refresh: refreshRecommendations
  } = useCachedAPI<CostOptimizationRecommendation[]>('/api/route-optimization/optimization-recommendations', undefined, {
    ttl: 600000, // 10 minutes
    staleWhileRevalidate: true
  });

  // Real-time cost updates
  const { isConnected: costWsConnected } = useOptimizedWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL?.replace('performance', 'cost-monitoring') || 'ws://localhost:8080/cost-monitoring',
    onBatchMessage: useCallback((messages) => {
      messages.forEach(message => {
        switch (message.type) {
          case 'cost_update':
            refreshCosts();
            break;
          case 'cost_alert':
            refreshAlerts();
            break;
          case 'optimization_recommendation':
            refreshRecommendations();
            break;
        }
      });
    }, [refreshCosts, refreshAlerts, refreshRecommendations])
  });

  // Update state when data is received
  useEffect(() => {
    if (costData?.services) {
      setServiceCosts(costData.services);
    }
  }, [costData]);

  useEffect(() => {
    if (alertsData) {
      setCostAlerts(alertsData);
    }
  }, [alertsData]);

  useEffect(() => {
    if (recommendationsData) {
      setOptimizationRecs(recommendationsData);
    }
  }, [recommendationsData]);

  // Computed values
  const dashboardMetrics = useMemo(() => {
    const totalToday = serviceCosts.reduce((sum, service) => sum + service.costs.today, 0);
    const totalMonth = serviceCosts.reduce((sum, service) => sum + service.costs.thisMonth, 0);
    const totalProjected = serviceCosts.reduce((sum, service) => sum + service.costs.projected, 0);
    const totalBudget = serviceCosts.reduce((sum, service) => sum + service.budget.monthlyLimit, 0);
    const totalSavings = optimizationRecs.reduce((sum, rec) => sum + rec.potentialSavings, 0);
    
    const activeAlerts = costAlerts.filter(alert => !alert.acknowledged);
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');

    return {
      totalToday,
      totalMonth,
      totalProjected,
      totalBudget,
      budgetUsage: totalBudget > 0 ? (totalMonth / totalBudget) * 100 : 0,
      totalSavings,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      monthlyTrend: costData?.trends.monthlyTrend || 0
    };
  }, [serviceCosts, costAlerts, optimizationRecs, costData]);

  // Action handlers
  const handleApplyOptimization = useCallback(async (recommendationId: string) => {
    try {
      const response = await fetch(`/api/route-optimization/apply-optimization/${recommendationId}`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to apply optimization');
      
      // Refresh data after applying optimization
      setTimeout(() => {
        refreshCosts();
        refreshRecommendations();
      }, 1000);
      
      onOptimizationApplied?.(recommendationId);
    } catch (error) {
      console.error('Failed to apply optimization:', error);
    }
  }, [refreshCosts, refreshRecommendations, onOptimizationApplied]);

  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/route-optimization/acknowledge-alert/${alertId}`, {
        method: 'POST'
      });
      refreshAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  }, [refreshAlerts]);

  const handleDismissAlert = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/route-optimization/dismiss-alert/${alertId}`, {
        method: 'DELETE'
      });
      refreshAlerts();
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  }, [refreshAlerts]);

  const refreshAllData = useCallback(() => {
    refreshCosts();
    refreshAlerts();
    refreshRecommendations();
  }, [refreshCosts, refreshAlerts, refreshRecommendations]);

  const isLoading = isLoadingCosts || isLoadingAlerts || isLoadingRecs;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Route Cost Monitoring</h1>
          <p className="text-gray-600">Track and optimize routing service costs</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={costWsConnected ? "default" : "destructive"}>
            {costWsConnected ? "Live Updates" : "Offline"}
          </Badge>
          
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={refreshAllData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Cost Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CostMetricCard
          title="Today's Costs"
          value={dashboardMetrics.totalToday}
          format="currency"
          icon={<DollarSign className="h-5 w-5 text-blue-600" />}
        />
        <CostMetricCard
          title="Monthly Costs"
          value={dashboardMetrics.totalMonth}
          format="currency"
          trend={dashboardMetrics.monthlyTrend > 0 ? 'up' : dashboardMetrics.monthlyTrend < 0 ? 'down' : 'stable'}
          trendValue={dashboardMetrics.monthlyTrend}
          icon={<BarChart3 className="h-5 w-5 text-green-600" />}
        />
        <CostMetricCard
          title="Budget Usage"
          value={dashboardMetrics.budgetUsage}
          format="percentage"
          color={dashboardMetrics.budgetUsage >= 90 ? 'error' : dashboardMetrics.budgetUsage >= 75 ? 'warning' : 'success'}
          icon={<Target className="h-5 w-5 text-purple-600" />}
        />
        <CostMetricCard
          title="Potential Savings"
          value={dashboardMetrics.totalSavings}
          format="currency"
          color="success"
          icon={<TrendingDown className="h-5 w-5 text-green-600" />}
        />
      </div>

      {/* Alert Summary */}
      {dashboardMetrics.activeAlerts > 0 && (
        <Alert className={dashboardMetrics.criticalAlerts > 0 ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {dashboardMetrics.criticalAlerts > 0 ? (
              <>
                <span className="font-semibold text-red-800">{dashboardMetrics.criticalAlerts} critical cost alerts</span>
                {dashboardMetrics.activeAlerts - dashboardMetrics.criticalAlerts > 0 && (
                  <span className="text-red-700"> and {dashboardMetrics.activeAlerts - dashboardMetrics.criticalAlerts} warnings</span>
                )}
                <span className="text-red-700"> require immediate attention.</span>
              </>
            ) : (
              <span className="text-yellow-800">{dashboardMetrics.activeAlerts} cost alerts need review.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading cost data...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Service cost breakdown table */}
              <div>
                <h3 className="text-lg font-medium mb-4">Service Cost Breakdown</h3>
                <ServiceCostTable
                  services={serviceCosts}
                  onServiceClick={(service) => console.log('Service clicked:', service.serviceName)}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="services">
          <ServiceCostTable
            services={serviceCosts}
            onServiceClick={(service) => console.log('Service details:', service.serviceName)}
          />
        </TabsContent>

        <TabsContent value="optimization">
          <OptimizationRecommendationsPanel
            recommendations={optimizationRecs}
            onApplyRecommendation={handleApplyOptimization}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <CostAlertsPanel
            alerts={costAlerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onDismissAlert={handleDismissAlert}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});

RouteCostMonitoringDashboard.displayName = 'RouteCostMonitoringDashboard';

export default RouteCostMonitoringDashboard;