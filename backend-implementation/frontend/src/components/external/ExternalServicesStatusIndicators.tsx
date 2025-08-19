"use client";

/**
 * ============================================================================
 * EXTERNAL SERVICES STATUS INDICATORS
 * ============================================================================
 *
 * Real-time service health monitoring component displaying live status
 * for all external API services with circuit breaker states and performance metrics.
 *
 * Features:
 * - Live status monitoring for 6 external services
 * - Circuit breaker state visualization
 * - Performance metrics (uptime, response time, error rates)
 * - Critical service alerts
 * - Quick action controls (health checks, service restarts)
 * - Mobile-responsive status grid
 *
 * Coordination Points:
 * - External-API-Integration-Specialist: Real-time service health data
 * - Backend External Services Manager: Health monitoring and metrics
 * - WebSocket: Real-time status updates
 * - Circuit Breaker Service: Fault tolerance status
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Circle, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap, 
  Activity,
  RefreshCw,
  Settings,
  Shield,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Target
} from 'lucide-react';
import { useExternalServiceCoordination, ExternalServiceStatus } from '@/hooks/useExternalServiceCoordination';

/**
 * Service Configuration
 */
const SERVICE_CONFIG = {
  stripe: {
    name: 'Stripe',
    icon: '💳',
    description: 'Payment Processing',
    color: 'purple',
    criticalPriority: 10
  },
  twilio: {
    name: 'Twilio',
    icon: '📱',
    description: 'SMS & Voice',
    color: 'red',
    criticalPriority: 8
  },
  sendgrid: {
    name: 'SendGrid',
    icon: '📧',
    description: 'Email Service',
    color: 'blue',
    criticalPriority: 7
  },
  samsara: {
    name: 'Samsara',
    icon: '🚛',
    description: 'Fleet Management',
    color: 'green',
    criticalPriority: 9
  },
  airtable: {
    name: 'Airtable',
    icon: '🗂️',
    description: 'Data Sync',
    color: 'orange',
    criticalPriority: 5
  },
  maps: {
    name: 'Maps',
    icon: '🗺️',
    description: 'Routing & Location',
    color: 'indigo',
    criticalPriority: 8
  }
};

/**
 * Status Colors
 */
const STATUS_COLORS = {
  healthy: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  degraded: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  unhealthy: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  disabled: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
};

const CIRCUIT_BREAKER_COLORS = {
  closed: { bg: 'bg-green-100', text: 'text-green-700' },
  open: { bg: 'bg-red-100', text: 'text-red-700' },
  half_open: { bg: 'bg-yellow-100', text: 'text-yellow-700' }
};

/**
 * Service Status Card Component
 */
const ServiceStatusCard: React.FC<{
  service: ExternalServiceStatus;
  onHealthCheck: (serviceName: string) => void;
  isRunningHealthCheck: boolean;
}> = ({ service, onHealthCheck, isRunningHealthCheck }) => {
  const config = SERVICE_CONFIG[service.name as keyof typeof SERVICE_CONFIG];
  const statusColor = STATUS_COLORS[service.status];
  const circuitColor = CIRCUIT_BREAKER_COLORS[service.circuitBreakerState];
  
  if (!config) {
    return null;
  }

  const handleHealthCheck = () => {
    onHealthCheck(service.name);
  };

  const getStatusIcon = () => {
    switch (service.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'disabled':
        return <Circle className="h-5 w-5 text-gray-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(1)}%`;
  };

  const formatResponseTime = (time: number) => {
    if (time < 1000) {
      return `${time.toFixed(0)}ms`;
    }
    return `${(time / 1000).toFixed(1)}s`;
  };

  const getPerformanceGrade = () => {
    const uptimeScore = service.uptime;
    const responseScore = service.responseTime <= 200 ? 100 : Math.max(0, 100 - (service.responseTime - 200) / 10);
    const errorScore = service.errorCount === 0 ? 100 : Math.max(0, 100 - service.errorCount * 2);
    
    const overall = (uptimeScore + responseScore + errorScore) / 3;
    
    if (overall >= 90) return { grade: 'A+', color: 'text-green-600' };
    if (overall >= 80) return { grade: 'A', color: 'text-green-600' };
    if (overall >= 70) return { grade: 'B+', color: 'text-yellow-600' };
    if (overall >= 60) return { grade: 'B', color: 'text-yellow-600' };
    return { grade: 'C', color: 'text-red-600' };
  };

  const performance = getPerformanceGrade();

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${statusColor.border} ${service.status === 'unhealthy' ? 'border-2' : 'border'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{config.icon}</div>
            <div>
              <div className="font-semibold">{config.name}</div>
              <div className="text-sm text-gray-600">{config.description}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <Badge 
              variant="outline" 
              className={`${performance.color} border-current`}
            >
              {performance.grade}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className={`p-3 rounded-lg ${statusColor.bg} ${statusColor.border} border`}>
          <div className="flex items-center justify-between">
            <span className={`font-medium ${statusColor.text}`}>
              {service.status.toUpperCase()}
            </span>
            <span className="text-sm text-gray-600">
              Updated {new Date(service.lastCheck).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Circuit Breaker Status */}
        <div className={`p-2 rounded-lg ${circuitColor.bg} flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <Shield className={`h-4 w-4 ${circuitColor.text}`} />
            <span className={`text-sm font-medium ${circuitColor.text}`}>
              Circuit Breaker: {service.circuitBreakerState.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center space-x-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-lg font-semibold text-green-600">
                {formatUptime(service.uptime)}
              </span>
            </div>
            <div className="text-xs text-gray-600">Uptime</div>
          </div>
          
          <div>
            <div className="flex items-center justify-center space-x-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-semibold text-blue-600">
                {formatResponseTime(service.responseTime)}
              </span>
            </div>
            <div className="text-xs text-gray-600">Response</div>
          </div>
          
          <div>
            <div className="flex items-center justify-center space-x-1">
              {service.errorCount > 0 ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <span className={`text-lg font-semibold ${service.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {service.errorCount}
              </span>
            </div>
            <div className="text-xs text-gray-600">Errors</div>
          </div>
        </div>

        {/* Request Success Rate */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Success Rate</span>
            <span>{((service.successCount / Math.max(service.successCount + service.errorCount, 1)) * 100).toFixed(1)}%</span>
          </div>
          <Progress 
            value={(service.successCount / Math.max(service.successCount + service.errorCount, 1)) * 100} 
            className="h-2" 
          />
        </div>

        {/* Priority Indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Priority Level</span>
          <Badge variant={service.priority >= 8 ? "destructive" : service.priority >= 6 ? "secondary" : "outline"}>
            P{service.priority} {service.priority >= 8 ? 'Critical' : service.priority >= 6 ? 'High' : 'Medium'}
          </Badge>
        </div>

        {/* Last Error */}
        {service.lastError && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Last Error:</strong> {service.lastError}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleHealthCheck}
          disabled={isRunningHealthCheck}
          className="w-full"
        >
          {isRunningHealthCheck ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Activity className="h-4 w-4 mr-2" />
          )}
          Health Check
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * System Health Overview Component
 */
const SystemHealthOverview: React.FC<{
  services: ExternalServiceStatus[];
  isConnected: boolean;
}> = ({ services, isConnected }) => {
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
  const disabledCount = services.filter(s => s.status === 'disabled').length;
  
  const totalServices = services.length;
  const overallHealth = (healthyCount / Math.max(totalServices, 1)) * 100;
  
  const criticalServices = services.filter(s => s.status === 'unhealthy' && s.priority >= 8);
  const avgResponseTime = services.reduce((sum, s) => sum + s.responseTime, 0) / Math.max(services.length, 1);
  const avgUptime = services.reduce((sum, s) => sum + s.uptime, 0) / Math.max(services.length, 1);

  const getOverallStatus = () => {
    if (criticalServices.length > 0) return { status: 'Critical', color: 'text-red-600', bg: 'bg-red-100' };
    if (unhealthyCount > 0) return { status: 'Degraded', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (degradedCount > 0) return { status: 'Warning', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'Healthy', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const overall = getOverallStatus();

  return (
    <Card className={`mb-6 ${overall.bg} border-2`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>System Health Overview</span>
            {isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
          
          <Badge variant="outline" className={`${overall.color} border-current text-lg px-3 py-1`}>
            {overall.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
            <div className="text-sm text-gray-600">Healthy Services</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{degradedCount}</div>
            <div className="text-sm text-gray-600">Degraded Services</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{unhealthyCount}</div>
            <div className="text-sm text-gray-600">Unhealthy Services</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{disabledCount}</div>
            <div className="text-sm text-gray-600">Disabled Services</div>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Overall Health</span>
              <span>{overallHealth.toFixed(1)}%</span>
            </div>
            <Progress value={overallHealth} className="h-2" />
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold">{avgResponseTime.toFixed(0)}ms</div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold">{avgUptime.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Avg Uptime</div>
          </div>
        </div>

        {criticalServices.length > 0 && (
          <Alert className="mt-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical Services Down:</strong> {criticalServices.map(s => s.name).join(', ')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Main External Services Status Indicators Component
 */
export interface ExternalServicesStatusIndicatorsProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  compactView?: boolean;
}

export const ExternalServicesStatusIndicators: React.FC<ExternalServicesStatusIndicatorsProps> = ({
  className,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  compactView = false
}) => {
  const [runningHealthChecks, setRunningHealthChecks] = useState<Set<string>>(new Set());

  // External service coordination hook
  const {
    serviceStatuses,
    triggerServiceHealthCheck,
    refreshStatuses,
    isLoadingStatuses,
    statusError,
    statusWsConnected,
    coordinationStatus
  } = useExternalServiceCoordination({
    enableRealTimeUpdates: true,
    updateInterval: refreshInterval
  });

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshStatuses();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshStatuses]);

  // Handle individual service health check
  const handleServiceHealthCheck = async (serviceName: string) => {
    if (runningHealthChecks.has(serviceName)) return;

    setRunningHealthChecks(prev => new Set(prev).add(serviceName));
    
    try {
      await triggerServiceHealthCheck(serviceName);
    } catch (error) {
      console.error(`Health check failed for ${serviceName}:`, error);
    } finally {
      setTimeout(() => {
        setRunningHealthChecks(prev => {
          const newSet = new Set(prev);
          newSet.delete(serviceName);
          return newSet;
        });
      }, 2000);
    }
  };

  // Sort services by priority and status
  const sortedServices = useMemo(() => {
    return [...serviceStatuses].sort((a, b) => {
      // Critical services first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Then by status severity
      const statusOrder = { unhealthy: 0, degraded: 1, healthy: 2, disabled: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [serviceStatuses]);

  if (statusError) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load service status data. Please try refreshing the page.
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
            <Activity className="h-6 w-6" />
            <span>Service Status Monitor</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Real-time health monitoring for external API services
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={refreshStatuses}
          disabled={isLoadingStatuses}
        >
          {isLoadingStatuses ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* System Health Overview */}
      {!compactView && (
        <SystemHealthOverview 
          services={serviceStatuses} 
          isConnected={statusWsConnected}
        />
      )}

      {/* Service Status Grid */}
      <div className={`grid gap-6 ${compactView ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2'}`}>
        {sortedServices.map(service => (
          <ServiceStatusCard
            key={service.name}
            service={service}
            onHealthCheck={handleServiceHealthCheck}
            isRunningHealthCheck={runningHealthChecks.has(service.name)}
          />
        ))}
      </div>

      {sortedServices.length === 0 && !isLoadingStatuses && (
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Found</h3>
            <p className="text-gray-600">External services are not configured or unavailable.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExternalServicesStatusIndicators;