"use client";

/**
 * ============================================================================
 * EXTERNAL SERVICES COST MONITORING DASHBOARD
 * ============================================================================
 *
 * Real-time cost monitoring dashboard for external API services.
 * Coordinates with External-API-Integration-Specialist for cost optimization
 * and budget management across all 6 external services.
 *
 * Features:
 * - Real-time cost tracking for Stripe, Twilio, SendGrid, Samsara, Airtable, Maps
 * - Budget alerts and threshold monitoring
 * - Cost optimization recommendations
 * - Historical cost analysis
 * - Service-specific cost breakdown
 * - Emergency cost controls
 *
 * Coordination Points:
 * - External-API-Integration-Specialist: Cost optimization service
 * - Cost Optimization Service: Real-time cost calculation
 * - Backend External Services Manager: Service metrics integration
 * - WebSocket: Real-time cost updates and alerts
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  Target,
  PieChart,
  BarChart3,
  Settings,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useExternalServiceCoordination, ServiceCostData, CostAlert } from '@/hooks/useExternalServiceCoordination';

/**
 * Service Icons Mapping
 */
const SERVICE_ICONS = {
  stripe: '💳',
  twilio: '📱',
  sendgrid: '📧',
  samsara: '🚛',
  airtable: '🗂️',
  maps: '🗺️'
};

/**
 * Service Colors for Visualization
 */
const SERVICE_COLORS = {
  stripe: 'bg-purple-500',
  twilio: 'bg-red-500',
  sendgrid: 'bg-blue-500',
  samsara: 'bg-green-500',
  airtable: 'bg-orange-500',
  maps: 'bg-indigo-500'
};

/**
 * Cost Threshold Component
 */
const CostThresholdIndicator: React.FC<{
  current: number;
  budget: number;
  label: string;
  format?: 'currency' | 'percentage';
}> = ({ current, budget, label, format = 'currency' }) => {
  const percentage = (current / budget) * 100;
  const status = percentage >= 90 ? 'critical' : percentage >= 70 ? 'warning' : 'good';
  
  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200'
  };

  const formatValue = (value: number) => {
    if (format === 'currency') {
      return `$${value.toFixed(2)}`;
    }
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-gray-600">{formatValue(current)} / {formatValue(budget)}</span>
      </div>
      <Progress value={Math.min(percentage, 100)} className="h-2" />
      <div className={`text-xs px-2 py-1 rounded border ${statusColors[status]}`}>
        {percentage.toFixed(1)}% of budget used
      </div>
    </div>
  );
};

/**
 * Service Cost Card Component
 */
const ServiceCostCard: React.FC<{
  service: ServiceCostData;
  onOptimize: (serviceName: string) => void;
  isOptimizing: boolean;
}> = ({ service, onOptimize, isOptimizing }) => {
  const icon = SERVICE_ICONS[service.serviceName as keyof typeof SERVICE_ICONS] || '🔧';
  const color = SERVICE_COLORS[service.serviceName as keyof typeof SERVICE_COLORS] || 'bg-gray-500';
  
  const hasAlerts = service.alerts.length > 0;
  const criticalAlerts = service.alerts.filter(alert => alert.severity === 'critical');
  
  const handleOptimize = () => {
    onOptimize(service.serviceName);
  };

  return (
    <Card className={`transition-all duration-200 ${hasAlerts ? 'border-yellow-300 bg-yellow-50' : ''} ${criticalAlerts.length > 0 ? 'border-red-300 bg-red-50' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold`}>
              {icon}
            </div>
            <span className="capitalize">{service.serviceName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={service.priority >= 8 ? "destructive" : service.priority >= 6 ? "secondary" : "outline"}>
              P{service.priority}
            </Badge>
            {hasAlerts && (
              <Badge variant={criticalAlerts.length > 0 ? "destructive" : "secondary"}>
                {service.alerts.length} Alert{service.alerts.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cost Overview */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-green-600">
              ${service.hourlyCost.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Hourly</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              ${service.dailyCost.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Daily</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-purple-600">
              ${service.monthlyCost.toFixed(0)}
            </div>
            <div className="text-xs text-gray-600">Monthly</div>
          </div>
        </div>

        {/* Budget Progress */}
        <CostThresholdIndicator
          current={service.hourlyCost}
          budget={service.budget.hourly / 100} // Convert from cents
          label="Hourly Budget"
        />

        {/* Usage Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium">{service.requestsPerHour}</div>
            <div className="text-gray-600">Requests/Hour</div>
          </div>
          <div>
            <div className={`font-medium ${service.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {service.errorRate.toFixed(1)}%
            </div>
            <div className="text-gray-600">Error Rate</div>
          </div>
        </div>

        {/* Alerts */}
        {service.alerts.map((alert, index) => (
          <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{alert.severity.toUpperCase()}:</strong> Current cost ${alert.currentCost.toFixed(2)} exceeds ${alert.threshold.toFixed(2)} threshold
            </AlertDescription>
          </Alert>
        ))}

        {/* Optimization Actions */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="flex-1"
          >
            {isOptimizing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Optimize
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Cost Overview Summary Component
 */
const CostOverviewSummary: React.FC<{
  costData: ServiceCostData[];
  totalBudget: number;
}> = ({ costData, totalBudget }) => {
  const totalHourlyCost = costData.reduce((sum, service) => sum + service.hourlyCost, 0);
  const totalDailyCost = costData.reduce((sum, service) => sum + service.dailyCost, 0);
  const totalMonthlyCost = costData.reduce((sum, service) => sum + service.monthlyCost, 0);
  const totalAlerts = costData.reduce((sum, service) => sum + service.alerts.length, 0);
  
  const budgetUtilization = (totalHourlyCost / (totalBudget / 100)) * 100; // Convert budget from cents
  const statusColor = budgetUtilization >= 90 ? 'text-red-600' : budgetUtilization >= 70 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">
                ${totalHourlyCost.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total Hourly Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-600">
                ${totalMonthlyCost.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Projected Monthly</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Target className={`h-5 w-5 ${statusColor}`} />
            <div>
              <div className={`text-2xl font-bold ${statusColor}`}>
                {budgetUtilization.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Budget Utilization</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`h-5 w-5 ${totalAlerts > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
            <div>
              <div className={`text-2xl font-bold ${totalAlerts > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                {totalAlerts}
              </div>
              <div className="text-sm text-gray-600">Active Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Main External Services Cost Dashboard Component
 */
export interface ExternalServicesCostDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const ExternalServicesCostDashboard: React.FC<ExternalServicesCostDashboardProps> = ({
  className,
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isOptimizing, setIsOptimizing] = useState<string | null>(null);
  const [optimizationResults, setOptimizationResults] = useState<Record<string, any>>({});

  // External service coordination hook
  const {
    costData,
    activeAlerts,
    coordinationStatus,
    triggerCostOptimization,
    refreshCosts,
    isLoadingCosts,
    costError,
    costWsConnected
  } = useExternalServiceCoordination({
    costMonitoringEnabled: true,
    enableRealTimeUpdates: true,
    updateInterval: refreshInterval
  });

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshCosts();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshCosts]);

  // Handle service-specific optimization
  const handleServiceOptimization = useCallback(async (serviceName: string) => {
    setIsOptimizing(serviceName);
    
    try {
      // This would call a service-specific optimization endpoint
      const response = await fetch(`/api/external-services/${serviceName}/optimize`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Optimization failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      setOptimizationResults(prev => ({
        ...prev,
        [serviceName]: result
      }));
      
      // Refresh cost data after optimization
      setTimeout(() => {
        refreshCosts();
      }, 2000);
      
    } catch (error) {
      console.error(`Failed to optimize ${serviceName}:`, error);
    } finally {
      setIsOptimizing(null);
    }
  }, [refreshCosts]);

  // Handle global cost optimization
  const handleGlobalOptimization = useCallback(async () => {
    setIsOptimizing('global');
    
    try {
      const result = await triggerCostOptimization();
      setOptimizationResults(prev => ({
        ...prev,
        global: result
      }));
    } catch (error) {
      console.error('Global optimization failed:', error);
    } finally {
      setIsOptimizing(null);
    }
  }, [triggerCostOptimization]);

  // Calculate total budget (example values)
  const totalBudget = 5000; // $50.00 per hour in cents

  // Memoized cost breakdown for charts
  const costBreakdown = useMemo(() => {
    return costData.map(service => ({
      name: service.serviceName,
      value: service.hourlyCost,
      color: SERVICE_COLORS[service.serviceName as keyof typeof SERVICE_COLORS] || '#gray-500'
    }));
  }, [costData]);

  if (costError) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load cost monitoring data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <DollarSign className="h-6 w-6" />
            <span>External Services Cost Monitor</span>
            {costWsConnected && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Live
              </Badge>
            )}
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time cost tracking and optimization for external API services
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGlobalOptimization}
            disabled={isOptimizing === 'global'}
          >
            {isOptimizing === 'global' ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Global Optimization
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refreshCosts}
            disabled={isLoadingCosts}
          >
            {isLoadingCosts ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Cost Overview Summary */}
      <CostOverviewSummary costData={costData} totalBudget={totalBudget} />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Service Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {costData.map(service => (
              <ServiceCostCard
                key={service.serviceName}
                service={service}
                onOptimize={handleServiceOptimization}
                isOptimizing={isOptimizing === service.serviceName}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Cost Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costBreakdown.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded ${item.color}`}></div>
                        <span className="capitalize">{item.name}</span>
                      </div>
                      <span className="font-medium">${item.value.toFixed(2)}/hr</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Usage Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costData.map(service => (
                    <div key={service.serviceName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{service.serviceName}</span>
                        <span>{service.requestsPerHour} req/hr</span>
                      </div>
                      <Progress 
                        value={(service.requestsPerHour / 1000) * 100} 
                        className="h-2" 
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Optimization Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costData.filter(service => service.alerts.length > 0).map(service => (
                    <div key={service.serviceName} className="border rounded-lg p-4">
                      <h4 className="font-medium capitalize mb-2">{service.serviceName}</h4>
                      <div className="space-y-2">
                        {service.alerts.map((alert, index) => (
                          <Alert key={index}>
                            <AlertDescription>
                              {alert.recommendedActions?.map((action, actionIndex) => (
                                <div key={actionIndex}>• {action}</div>
                              )) || 'Review service usage patterns and implement rate limiting.'}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {costData.every(service => service.alerts.length === 0) && (
                    <div className="text-center py-8 text-gray-600">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                      <p>All services are operating within budget thresholds</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExternalServicesCostDashboard;