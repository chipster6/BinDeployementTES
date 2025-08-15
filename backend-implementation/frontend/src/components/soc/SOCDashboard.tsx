"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Eye, 
  Clock,
  TrendingUp,
  Lock,
  Zap,
  Globe,
  Bell,
  X
} from 'lucide-react';
import { ThreatDetectionPanel } from './ThreatDetectionPanel';
import { SecurityMetricsPanel } from './SecurityMetricsPanel';
import { IncidentResponsePanel } from './IncidentResponsePanel';
import { ThreatMapVisualization } from './ThreatMapVisualization';
import { ComplianceStatusPanel } from './ComplianceStatusPanel';
import { useSOCWebSocket } from '@/hooks/useSOCWebSocket';
import { 
  SecurityMetrics, 
  ThreatDetection, 
  SecurityIncident, 
  ThreatLevel,
  UserRole 
} from '@/lib/types';

interface SOCDashboardProps {
  userRole: UserRole;
  className?: string;
}

export function SOCDashboard({ userRole, className }: SOCDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'incidents' | 'intelligence' | 'compliance'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has access to SOC dashboard
  const hasSOCAccess = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRole);

  // Use SOC WebSocket hook for real-time data
  const {
    isConnected,
    connectionState,
    threats,
    incidents,
    metrics,
    intelligence,
    auditLogs,
    notifications,
    clearNotification,
    clearAllNotifications,
    reconnect
  } = useSOCWebSocket();

  useEffect(() => {
    if (hasSOCAccess && (threats.length > 0 || incidents.length > 0 || metrics)) {
      setIsLoading(false);
    }
  }, [hasSOCAccess, threats, incidents, metrics]);

  const loadSOCData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch security metrics
      const metricsResponse = await fetch('/api/security/metrics');
      const metricsData = await metricsResponse.json();
      
      // Fetch recent threats
      const threatsResponse = await fetch('/api/security/threats?limit=50');
      const threatsData = await threatsResponse.json();
      
      // Fetch active incidents
      const incidentsResponse = await fetch('/api/security/incidents?status=open,in_progress');
      const incidentsData = await incidentsResponse.json();
      
      console.log('Manual data refresh completed');
      
    } catch (error) {
      console.error('Failed to load SOC data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getThreatLevelColor = (level: ThreatLevel): string => {
    switch (level) {
      case ThreatLevel.CRITICAL: return 'destructive';
      case ThreatLevel.HIGH: return 'destructive';
      case ThreatLevel.MEDIUM: return 'default';
      case ThreatLevel.LOW: return 'secondary';
      default: return 'secondary';
    }
  };

  const getSystemHealthColor = (health: number): string => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!hasSOCAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">
            You don't have permission to access the Security Operations Center.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} role="main" aria-label="Security Operations Center Dashboard">
      {/* SOC Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Security Operations Center</h1>
          <p className="text-muted-foreground">
            Real-time security monitoring and threat response
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="relative">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Alerts
                <Badge variant="destructive" className="ml-2">
                  {notifications.length}
                </Badge>
              </Button>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Live' : connectionState}
            </span>
          </div>
          
          {!isConnected && (
            <Button onClick={reconnect} size="sm" variant="outline">
              Reconnect
            </Button>
          )}
          
          <Button onClick={loadSOCData} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Threats Detected
                  </p>
                  <p className="text-2xl font-bold">{metrics.threatsDetected}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Open Incidents
                  </p>
                  <p className="text-2xl font-bold">{metrics.incidentsOpen}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className={`h-4 w-4 ${getSystemHealthColor(metrics.systemHealth)}`} />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    System Health
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold">{metrics.systemHealth}%</p>
                    <Progress value={metrics.systemHealth} className="w-16" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Avg Response Time
                  </p>
                  <p className="text-2xl font-bold">{metrics.averageResponseTime}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="overflow-x-auto">
        <div 
          className="flex space-x-1 border-b min-w-max" 
          role="tablist" 
          aria-label="Security Operations Center navigation"
        >
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'threats', label: 'Threat Detection', icon: Shield },
            { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
            { id: 'intelligence', label: 'Threat Intel', icon: Globe },
            { id: 'compliance', label: 'Compliance', icon: Lock },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center space-x-2 whitespace-nowrap"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border-l-4 ${
                notification.severity === 'critical' ? 'border-red-500 bg-red-50' :
                notification.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                notification.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold">{notification.title}</h4>
                    <Badge variant={
                      notification.severity === 'critical' ? 'destructive' :
                      notification.severity === 'high' ? 'destructive' :
                      'default'
                    }>
                      {notification.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => clearNotification(notification.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {notifications.length > 3 && (
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={clearAllNotifications}>
                Clear all {notifications.length} notifications
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div 
            role="tabpanel" 
            id="overview-panel" 
            aria-labelledby="overview-tab"
            className="grid gap-6 xl:grid-cols-2"
          >
            <ThreatDetectionPanel 
              threats={threats.slice(0, 10)} 
              onThreatClick={(threat) => console.log('Threat clicked:', threat)}
            />
            <IncidentResponsePanel 
              incidents={incidents.slice(0, 5)}
              onIncidentClick={(incident) => console.log('Incident clicked:', incident)}
            />
            <div className="xl:col-span-2">
              <ThreatMapVisualization threats={threats} />
            </div>
          </div>
        )}

        {activeTab === 'threats' && (
          <div 
            role="tabpanel" 
            id="threats-panel" 
            aria-labelledby="threats-tab"
          >
            <ThreatDetectionPanel 
              threats={threats} 
              onThreatClick={(threat) => console.log('Threat clicked:', threat)}
              expanded={true}
            />
          </div>
        )}

        {activeTab === 'incidents' && (
          <div 
            role="tabpanel" 
            id="incidents-panel" 
            aria-labelledby="incidents-tab"
          >
            <IncidentResponsePanel 
              incidents={incidents}
              onIncidentClick={(incident) => console.log('Incident clicked:', incident)}
              expanded={true}
            />
          </div>
        )}

        {activeTab === 'intelligence' && (
          <div 
            role="tabpanel" 
            id="intelligence-panel" 
            aria-labelledby="intelligence-tab"
            className="grid gap-6 lg:grid-cols-2"
          >
            <ThreatMapVisualization threats={threats} />
            <SecurityMetricsPanel metrics={metrics} />
          </div>
        )}

        {activeTab === 'compliance' && (
          <div 
            role="tabpanel" 
            id="compliance-panel" 
            aria-labelledby="compliance-tab"
          >
            <ComplianceStatusPanel />
          </div>
        )}
      </div>

      {/* Recent Activity Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Security Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {threats.slice(0, 5).map((threat) => (
              <div key={threat.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <Badge variant={getThreatLevelColor(threat.level) as any}>
                    {threat.level.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{threat.description}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(threat.detectedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}