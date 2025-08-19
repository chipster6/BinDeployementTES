'use client';

/**
 * ============================================================================
 * ROUTE SERVICE HEALTH MONITOR
 * ============================================================================
 * 
 * Comprehensive health monitoring interface for route optimization services.
 * Provides real-time service status, automated alerts, incident tracking,
 * and performance monitoring for all external routing APIs.
 * 
 * Features:
 * - Real-time service health monitoring for all routing providers
 * - Automated incident detection and alerting
 * - Service performance metrics and trend analysis  
 * - Circuit breaker status and fallback management
 * - Notification system with escalation policies
 * - Historical incident tracking and analysis
 * - Service dependency mapping and impact assessment
 * - Mobile-responsive design with accessibility features
 * 
 * Integration Points:
 * - ExternalAPIResilienceManager: Multi-provider health status
 * - RealTimeTrafficWebSocketService: Live service updates
 * - HealthMonitoringService: Performance metrics and alerts
 * - NotificationService: Alert delivery and escalation
 * 
 * Created by: Frontend-Agent (Health Monitoring Integration)
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
  Shield,
  Activity,
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Settings,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Server,
  Wifi,
  WifiOff,
  Target,
  BarChart3,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { useCachedAPI } from '@/hooks/useCachedAPI';
import useOptimizedWebSocket from '@/hooks/useOptimizedWebSocket';
import useExternalServiceCoordination from '@/hooks/useExternalServiceCoordination';

// Type definitions for health monitoring
export interface ServiceHealthStatus {
  serviceId: string;
  serviceName: string;
  displayName: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance' | 'disabled';
  healthScore: number; // 0-100
  uptime: number; // percentage
  responseTime: {
    current: number;
    average: number;
    p95: number;
    p99: number;
  };
  errorRate: {
    current: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  circuitBreaker: {
    state: 'closed' | 'open' | 'half_open';
    failureCount: number;
    lastFailure?: Date;
    nextRetry?: Date;
  };
  lastCheck: Date;
  lastIncident?: Date;
  dependencies: string[];
  tags: string[];
}

export interface ServiceIncident {
  id: string;
  serviceId: string;
  serviceName: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: {
    affectedUsers: number;
    estimatedDowntime: number;
    businessImpact: 'low' | 'medium' | 'high' | 'critical';
  };
  timeline: Array<{
    timestamp: Date;
    status: string;
    description: string;
    author: string;
  }>;
  startTime: Date;
  resolvedTime?: Date;
  rootCause?: string;
  resolution?: string;
}

export interface ServiceAlert {
  id: string;
  serviceId: string;
  serviceName: string;
  alertType: 'latency_high' | 'error_rate_high' | 'service_down' | 'circuit_breaker_open' | 'quota_exceeded';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  notificationsSent: number;
  escalated: boolean;
}

export interface ServiceMetrics {
  serviceId: string;
  timeRange: string;
  metrics: {
    requestCount: number;
    successCount: number;
    errorCount: number;
    averageResponseTime: number;
    uptimePercentage: number;
  };
  trends: {
    requestTrend: number;
    errorTrend: number;
    latencyTrend: number;
  };
  timestamps: Date[];
  values: {
    requests: number[];
    errors: number[];
    latency: number[];
  };
}

interface RouteServiceHealthMonitorProps {
  organizationId?: string;
  refreshInterval?: number;
  enableNotifications?: boolean;
  showAdvancedMetrics?: boolean;
  compactMode?: boolean;
}

/**
 * Service Status Card Component
 */
const ServiceStatusCard = memo<{
  service: ServiceHealthStatus;
  onViewDetails: (serviceId: string) => void;
  onRunHealthCheck: (serviceId: string) => void;
  onToggleCircuitBreaker: (serviceId: string) => void;
  showActions?: boolean;
}>(({ service, onViewDetails, onRunHealthCheck, onToggleCircuitBreaker, showActions = true }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-800 bg-green-100 border-green-200';
      case 'degraded': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'unhealthy': return 'text-red-800 bg-red-100 border-red-200';
      case 'maintenance': return 'text-blue-800 bg-blue-100 border-blue-200';
      case 'disabled': return 'text-gray-800 bg-gray-100 border-gray-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': return <XCircle className="h-4 w-4" />;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      case 'disabled': return <Pause className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'closed': return 'text-green-600';
      case 'open': return 'text-red-600';
      case 'half_open': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      service.status === 'unhealthy' ? 'ring-2 ring-red-200' : 
      service.status === 'degraded' ? 'ring-1 ring-yellow-200' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gray-50">
              <Server className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{service.displayName}</CardTitle>
              <CardDescription className="flex items-center space-x-2">
                <span>{service.provider}</span>
                {service.tags.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {service.tags[0]}
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(service.status)}>
              {getStatusIcon(service.status)}
              <span className="ml-1 capitalize">{service.status}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Health Score</span>
            <span className="font-semibold">{service.healthScore}/100</span>
          </div>
          <Progress 
            value={service.healthScore} 
            className={`h-2 ${
              service.healthScore >= 90 ? '' : 
              service.healthScore >= 70 ? 'bg-yellow-100' : 'bg-red-100'
            }`}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Uptime</div>
            <div className="font-semibold">{service.uptime.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-gray-600">Response Time</div>
            <div className="font-semibold">{formatResponseTime(service.responseTime.current)}</div>
          </div>
          <div>
            <div className="text-gray-600">Error Rate</div>
            <div className={`font-semibold ${
              service.errorRate.current > 5 ? 'text-red-600' :
              service.errorRate.current > 2 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {service.errorRate.current.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-gray-600">Circuit Breaker</div>
            <div className={`font-semibold capitalize ${getCircuitBreakerColor(service.circuitBreaker.state)}`}>
              {service.circuitBreaker.state.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Circuit Breaker Details */}
        {service.circuitBreaker.state !== 'closed' && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <div className="font-medium text-gray-700 mb-1">Circuit Breaker Status</div>
              <div className="text-gray-600">
                Failures: {service.circuitBreaker.failureCount}
                {service.circuitBreaker.nextRetry && (
                  <span className="ml-2">
                    Next retry: {new Date(service.circuitBreaker.nextRetry).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Last Incident */}
        {service.lastIncident && (
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-sm">
              <div className="font-medium text-orange-700 mb-1">Last Incident</div>
              <div className="text-orange-600">
                {new Date(service.lastIncident).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Dependencies */}
        {service.dependencies.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Dependencies</div>
            <div className="flex flex-wrap gap-1">
              {service.dependencies.map((dep) => (
                <Badge key={dep} variant="outline" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex space-x-2 pt-2 border-t">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onViewDetails(service.serviceId)}
              className="flex-1"
            >
              <Eye className="h-3 w-3 mr-2" />
              Details
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onRunHealthCheck(service.serviceId)}
            >
              <Activity className="h-3 w-3 mr-2" />
              Check
            </Button>
            {service.circuitBreaker.state !== 'closed' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onToggleCircuitBreaker(service.serviceId)}
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                Reset
              </Button>
            )}
          </div>
        )}

        {/* Last Check Time */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          Last check: {new Date(service.lastCheck).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
});

ServiceStatusCard.displayName = 'ServiceStatusCard';

/**
 * Incident Timeline Component
 */
const IncidentTimeline = memo<{
  incidents: ServiceIncident[];
  onViewIncident: (incidentId: string) => void;
  showResolved?: boolean;
}>(({ incidents, onViewIncident, showResolved = false }) => {
  const filteredIncidents = showResolved ? incidents : incidents.filter(i => i.status !== 'resolved');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-200';
      case 'high': return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-800 bg-blue-100 border-blue-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'investigating': return 'text-red-600';
      case 'identified': return 'text-orange-600';
      case 'monitoring': return 'text-yellow-600';
      case 'resolved': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const calculateDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Service Incidents</h3>
        <div className="text-sm text-gray-600">
          {filteredIncidents.length} {showResolved ? 'total' : 'active'} incidents
        </div>
      </div>

      {filteredIncidents.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">No active incidents</p>
          <p className="text-sm text-gray-500">All services are operating normally</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <Card key={incident.id} className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <CardTitle className="text-base">{incident.title}</CardTitle>
                      <CardDescription className="flex items-center space-x-2">
                        <span>{incident.serviceName}</span>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(incident.status)}>
                          {incident.status}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>Duration: {calculateDuration(incident.startTime, incident.resolvedTime)}</div>
                    <div>Started: {new Date(incident.startTime).toLocaleString()}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700">{incident.description}</p>
                
                {/* Impact Summary */}
                <div className="grid grid-cols-3 gap-4 text-sm p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-gray-600">Affected Users</div>
                    <div className="font-semibold">{incident.impact.affectedUsers.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Downtime</div>
                    <div className="font-semibold">{incident.impact.estimatedDowntime}m</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Business Impact</div>
                    <div className={`font-semibold capitalize ${
                      incident.impact.businessImpact === 'critical' ? 'text-red-600' :
                      incident.impact.businessImpact === 'high' ? 'text-orange-600' :
                      incident.impact.businessImpact === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {incident.impact.businessImpact}
                    </div>
                  </div>
                </div>

                {/* Latest Timeline Entry */}
                {incident.timeline.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium text-blue-700 mb-1">Latest Update</div>
                      <div className="text-blue-600">
                        {incident.timeline[incident.timeline.length - 1].description}
                      </div>
                      <div className="text-xs text-blue-500 mt-1">
                        {new Date(incident.timeline[incident.timeline.length - 1].timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onViewIncident(incident.id)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <div className="text-xs text-gray-500">
                    ID: {incident.id.slice(-8)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

IncidentTimeline.displayName = 'IncidentTimeline';

/**
 * Service Alerts Panel
 */
const ServiceAlertsPanel = memo<{
  alerts: ServiceAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  onDismissAlert: (alertId: string) => void;
}>(({ alerts, onAcknowledgeAlert, onDismissAlert }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const activeAlerts = alerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Service Alerts</h3>
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
                    <div className="font-medium">{alert.serviceName}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <AlertDescription className="mb-3">
                    {alert.message}
                  </AlertDescription>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <div className="text-gray-600">Current Value</div>
                      <div className="font-semibold">{alert.currentValue}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Threshold</div>
                      <div className="font-semibold">{alert.threshold}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
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
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {alert.escalated && <Badge variant="destructive">Escalated</Badge>}
                      <span>{alert.notificationsSent} notifications sent</span>
                    </div>
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* No active alerts */}
      {activeAlerts.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">No active alerts</p>
          <p className="text-sm text-gray-500">All services are operating within normal parameters</p>
        </div>
      )}

      {/* Recently Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium">Recently Acknowledged</h4>
          {acknowledgedAlerts.slice(0, 3).map((alert) => (
            <Card key={alert.id} className="opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium">{alert.serviceName}</div>
                    <div className="text-sm text-gray-600">{alert.message}</div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Acknowledged by {alert.acknowledgedBy}</div>
                    <div>{alert.acknowledgedAt && new Date(alert.acknowledgedAt).toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

ServiceAlertsPanel.displayName = 'ServiceAlertsPanel';

/**
 * Main Route Service Health Monitor Component
 */
export const RouteServiceHealthMonitor = memo<RouteServiceHealthMonitorProps>(({
  organizationId = 'default',
  refreshInterval = 30000,
  enableNotifications = true,
  showAdvancedMetrics = true,
  compactMode = false
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [serviceStatuses, setServiceStatuses] = useState<ServiceHealthStatus[]>([]);
  const [incidents, setIncidents] = useState<ServiceIncident[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(enableNotifications);

  // External service coordination
  const {
    serviceStatuses: coordinationStatuses,
    isCoordinating,
    coordinationStatus,
    statusWsConnected,
    refreshStatuses
  } = useExternalServiceCoordination({
    enableRealTimeUpdates: true,
    updateInterval: refreshInterval
  });

  // Health monitoring data
  const {
    data: healthData,
    isLoading: isLoadingHealth,
    error: healthError,
    refresh: refreshHealth
  } = useCachedAPI<{
    services: ServiceHealthStatus[];
    summary: {
      totalServices: number;
      healthyServices: number;
      degradedServices: number;
      unhealthyServices: number;
      overallHealth: number;
    };
  }>('/api/route-optimization/health-status', undefined, {
    ttl: refreshInterval,
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  // Incidents data
  const {
    data: incidentsData,
    isLoading: isLoadingIncidents,
    refresh: refreshIncidents
  } = useCachedAPI<ServiceIncident[]>('/api/route-optimization/incidents', undefined, {
    ttl: 60000,
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  // Alerts data  
  const {
    data: alertsData,
    isLoading: isLoadingAlerts,
    refresh: refreshAlerts
  } = useCachedAPI<ServiceAlert[]>('/api/route-optimization/alerts', undefined, {
    ttl: 30000,
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  // Real-time health monitoring WebSocket
  const { isConnected: healthWsConnected } = useOptimizedWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL?.replace('performance', 'health-monitoring') || 'ws://localhost:8080/health-monitoring',
    onBatchMessage: useCallback((messages) => {
      messages.forEach(message => {
        switch (message.type) {
          case 'service_health_update':
            refreshHealth();
            break;
          case 'incident_update':
            refreshIncidents();
            break;
          case 'alert_triggered':
            refreshAlerts();
            break;
        }
      });
    }, [refreshHealth, refreshIncidents, refreshAlerts])
  });

  // Update state when data is received
  useEffect(() => {
    if (healthData?.services) {
      setServiceStatuses(healthData.services);
    }
  }, [healthData]);

  useEffect(() => {
    if (incidentsData) {
      setIncidents(incidentsData);
    }
  }, [incidentsData]);

  useEffect(() => {
    if (alertsData) {
      setAlerts(alertsData);
    }
  }, [alertsData]);

  // Computed health metrics
  const healthMetrics = useMemo(() => {
    const totalServices = serviceStatuses.length;
    const healthyServices = serviceStatuses.filter(s => s.status === 'healthy').length;
    const degradedServices = serviceStatuses.filter(s => s.status === 'degraded').length;
    const unhealthyServices = serviceStatuses.filter(s => s.status === 'unhealthy').length;
    const averageHealthScore = totalServices > 0 
      ? serviceStatuses.reduce((sum, s) => sum + s.healthScore, 0) / totalServices 
      : 0;
    const averageUptime = totalServices > 0
      ? serviceStatuses.reduce((sum, s) => sum + s.uptime, 0) / totalServices
      : 0;
    
    const activeIncidents = incidents.filter(i => i.status !== 'resolved').length;
    const activeAlerts = alerts.filter(a => !a.acknowledged).length;
    const criticalAlerts = alerts.filter(a => !a.acknowledged && a.severity === 'critical').length;

    return {
      totalServices,
      healthyServices,
      degradedServices,
      unhealthyServices,
      averageHealthScore,
      averageUptime,
      activeIncidents,
      activeAlerts,
      criticalAlerts,
      overallStatus: unhealthyServices > 0 ? 'unhealthy' : 
                    degradedServices > 0 ? 'degraded' : 'healthy'
    };
  }, [serviceStatuses, incidents, alerts]);

  // Action handlers
  const handleRunHealthCheck = useCallback(async (serviceId: string) => {
    try {
      await fetch(`/api/route-optimization/health-check/${serviceId}`, {
        method: 'POST'
      });
      setTimeout(() => {
        refreshHealth();
      }, 1000);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }, [refreshHealth]);

  const handleViewServiceDetails = useCallback((serviceId: string) => {
    console.log('Viewing service details for:', serviceId);
  }, []);

  const handleViewIncident = useCallback((incidentId: string) => {
    console.log('Viewing incident details for:', incidentId);
  }, []);

  const handleToggleCircuitBreaker = useCallback(async (serviceId: string) => {
    try {
      await fetch(`/api/route-optimization/circuit-breaker/${serviceId}/toggle`, {
        method: 'POST'
      });
      setTimeout(() => {
        refreshHealth();
      }, 1000);
    } catch (error) {
      console.error('Circuit breaker toggle failed:', error);
    }
  }, [refreshHealth]);

  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/route-optimization/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      refreshAlerts();
    } catch (error) {
      console.error('Alert acknowledgment failed:', error);
    }
  }, [refreshAlerts]);

  const handleDismissAlert = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/route-optimization/alerts/${alertId}`, {
        method: 'DELETE'
      });
      refreshAlerts();
    } catch (error) {
      console.error('Alert dismissal failed:', error);
    }
  }, [refreshAlerts]);

  const refreshAllData = useCallback(() => {
    refreshHealth();
    refreshIncidents();
    refreshAlerts();
    refreshStatuses();
  }, [refreshHealth, refreshIncidents, refreshAlerts, refreshStatuses]);

  const isLoading = isLoadingHealth || isLoadingIncidents || isLoadingAlerts;
  const isConnected = statusWsConnected && healthWsConnected;

  // Get overall status color
  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'unhealthy': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className={`p-6 space-y-6 ${compactMode ? 'p-4 space-y-4' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Health Monitor</h1>
          <p className="text-gray-600">Real-time health monitoring for route optimization services</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? "Live Monitoring" : "Offline"}
          </Badge>
          
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          >
            {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
          
          <Button variant="outline" onClick={refreshAllData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className={getOverallStatusColor(healthMetrics.overallStatus)}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Overall Status</span>
            </div>
            <div className="text-xl font-bold capitalize">{healthMetrics.overallStatus}</div>
            <div className="text-sm opacity-75">
              {healthMetrics.healthyServices}/{healthMetrics.totalServices} services healthy
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Health Score</span>
            </div>
            <div className="text-xl font-bold">{healthMetrics.averageHealthScore.toFixed(0)}/100</div>
            <div className="text-sm text-gray-600">Average across services</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-green-600" />
              <span className="font-medium">Uptime</span>
            </div>
            <div className="text-xl font-bold">{healthMetrics.averageUptime.toFixed(2)}%</div>
            <div className="text-sm text-gray-600">Average availability</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="font-medium">Active Incidents</span>
            </div>
            <div className="text-xl font-bold">{healthMetrics.activeIncidents}</div>
            <div className="text-sm text-gray-600">Ongoing issues</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Bell className="h-5 w-5 text-red-600" />
              <span className="font-medium">Active Alerts</span>
            </div>
            <div className="text-xl font-bold">{healthMetrics.activeAlerts}</div>
            <div className="text-sm text-gray-600">
              {healthMetrics.criticalAlerts} critical
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Banner */}
      {healthMetrics.criticalAlerts > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            <span className="font-semibold">{healthMetrics.criticalAlerts} critical alerts</span>
            {healthMetrics.activeAlerts - healthMetrics.criticalAlerts > 0 && (
              <span> and {healthMetrics.activeAlerts - healthMetrics.criticalAlerts} warnings</span>
            )}
            <span> require immediate attention.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading health data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {serviceStatuses.map((service) => (
                <ServiceStatusCard
                  key={service.serviceId}
                  service={service}
                  onViewDetails={handleViewServiceDetails}
                  onRunHealthCheck={handleRunHealthCheck}
                  onToggleCircuitBreaker={handleToggleCircuitBreaker}
                  showActions={!compactMode}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceStatuses.map((service) => (
              <ServiceStatusCard
                key={service.serviceId}
                service={service}
                onViewDetails={handleViewServiceDetails}
                onRunHealthCheck={handleRunHealthCheck}
                onToggleCircuitBreaker={handleToggleCircuitBreaker}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="incidents">
          <IncidentTimeline
            incidents={incidents}
            onViewIncident={handleViewIncident}
            showResolved={showAdvancedMetrics}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <ServiceAlertsPanel
            alerts={alerts}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onDismissAlert={handleDismissAlert}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});

RouteServiceHealthMonitor.displayName = 'RouteServiceHealthMonitor';

export default RouteServiceHealthMonitor;