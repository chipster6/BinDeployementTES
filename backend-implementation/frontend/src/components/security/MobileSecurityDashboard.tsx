'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Users,
  Activity,
  Brain,
  Target,
  Bell,
  Menu,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Filter,
  Search,
  Phone,
  Mail,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Globe,
  Lock,
  Unlock,
  Key,
  Server,
  Database,
  Network
} from 'lucide-react';
import { ThreatLevel, ThreatDetection, SecurityIncident, IncidentStatus, UserRole } from '@/lib/types';

interface MobileDashboardProps {
  userRole: UserRole;
  className?: string;
}

interface SecurityAlert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  actionRequired: boolean;
  category: 'threat' | 'compliance' | 'system' | 'policy';
}

interface QuickMetric {
  id: string;
  label: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  color: 'red' | 'yellow' | 'green' | 'blue' | 'purple';
  icon: React.ReactNode;
}

export default function MobileSecurityDashboard({ userRole, className }: MobileDashboardProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([
    {
      id: '1',
      title: 'Critical Threat Detected',
      message: 'Advanced persistent threat targeting route optimization service',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      actionRequired: true,
      category: 'threat'
    },
    {
      id: '2',
      title: 'SOC 2 Audit Due',
      message: 'Annual SOC 2 compliance audit scheduled for next month',
      severity: 'medium',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      actionRequired: true,
      category: 'compliance'
    },
    {
      id: '3',
      title: 'Key Rotation Scheduled',
      message: 'Database encryption key rotation planned for this weekend',
      severity: 'low',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      actionRequired: false,
      category: 'system'
    }
  ]);

  const [quickMetrics, setQuickMetrics] = useState<QuickMetric[]>([
    {
      id: 'security-score',
      label: 'Security Score',
      value: '94.7%',
      trend: 'up',
      color: 'green',
      icon: <Shield className="h-4 w-4" />
    },
    {
      id: 'active-threats',
      label: 'Active Threats',
      value: 3,
      trend: 'down',
      color: 'red',
      icon: <AlertTriangle className="h-4 w-4" />
    },
    {
      id: 'response-time',
      label: 'Response Time',
      value: '12min',
      trend: 'down',
      color: 'blue',
      icon: <Clock className="h-4 w-4" />
    },
    {
      id: 'compliance',
      label: 'Compliance',
      value: '92.3%',
      trend: 'up',
      color: 'purple',
      icon: <CheckCircle className="h-4 w-4" />
    }
  ]);

  const [recentIncidents] = useState<SecurityIncident[]>([
    {
      id: 'INC-001',
      title: 'Malware Detection',
      description: 'Suspicious activity detected on endpoint',
      threatLevel: ThreatLevel.HIGH,
      incidentType: 'malware' as any,
      status: IncidentStatus.IN_PROGRESS,
      reportedBy: 'AI-Detection-System',
      reportedAt: new Date().toISOString(),
      timeline: [],
      affectedAssets: ['endpoint-001'],
      responseActions: []
    },
    {
      id: 'INC-002',
      title: 'Failed Login Attempts',
      description: 'Multiple failed authentication attempts',
      threatLevel: ThreatLevel.MEDIUM,
      incidentType: 'unauthorized_access' as any,
      status: IncidentStatus.OPEN,
      reportedBy: 'Auth-Monitor',
      reportedAt: new Date(Date.now() - 1800000).toISOString(),
      timeline: [],
      affectedAssets: ['auth-service'],
      responseActions: []
    }
  ]);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasAccess = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRole);

  const refreshData = async () => {
    setIsRefreshing(true);
    // Simulate API refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3" />;
      case 'down': return <TrendingDown className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getMetricColor = (color: string) => {
    switch (color) {
      case 'red': return 'text-red-600 bg-red-50';
      case 'yellow': return 'text-yellow-600 bg-yellow-50';
      case 'green': return 'text-green-600 bg-green-50';
      case 'blue': return 'text-blue-600 bg-blue-50';
      case 'purple': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high');

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <div className="text-center">
          <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-gray-600 text-sm">
            You don't have permission to access security features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Security Center</h1>
            <p className="text-xs text-gray-600">Real-time monitoring</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
              className="p-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <Sheet open={showQuickActions} onOpenChange={setShowQuickActions}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Quick Actions</SheetTitle>
                  <SheetDescription>Security management shortcuts</SheetDescription>
                </SheetHeader>
                <div className="space-y-3 mt-6">
                  <Button className="w-full justify-start" variant="outline">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    View All Threats
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    Incident Response
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Security Analytics
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Security Settings
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Bell className="h-4 w-4 mr-2" />
                    Alert Settings
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Critical Alerts</h3>
              <Badge variant="destructive">{criticalAlerts.length}</Badge>
            </div>
            <p className="text-sm text-red-700 mb-3">
              {criticalAlerts.length} security issue{criticalAlerts.length > 1 ? 's' : ''} require immediate attention
            </p>
            <Button size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Review Alerts
            </Button>
          </div>
        )}

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {quickMetrics.map((metric) => (
            <Card key={metric.id} className="p-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${getMetricColor(metric.color)}`}>
                    {metric.icon}
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(metric.trend)}
                  </div>
                </div>
                <div className="text-lg font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                <div className="text-xs text-gray-600">
                  {metric.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Security Status Overview */}
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'status' ? null : 'status')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Security Status</CardTitle>
              {expandedSection === 'status' ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </div>
          </CardHeader>
          {expandedSection === 'status' && (
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Overall Security</span>
                    <span className="text-sm font-bold text-green-600">94.7%</span>
                  </div>
                  <Progress value={94.7} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Threat Detection</span>
                    <span className="text-sm font-bold text-blue-600">91.2%</span>
                  </div>
                  <Progress value={91.2} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Compliance</span>
                    <span className="text-sm font-bold text-purple-600">92.3%</span>
                  </div>
                  <Progress value={92.3} className="h-2" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">1,247</div>
                  <div className="text-xs text-gray-600">Threats Blocked</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">3</div>
                  <div className="text-xs text-gray-600">Active Incidents</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900">12min</div>
                  <div className="text-xs text-gray-600">Avg Response</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'incidents' ? null : 'incidents')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Incidents</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{recentIncidents.length}</Badge>
                {expandedSection === 'incidents' ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </div>
            </div>
          </CardHeader>
          {expandedSection === 'incidents' && (
            <CardContent>
              <div className="space-y-3">
                {recentIncidents.map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-900">{incident.title}</h4>
                      <Badge 
                        variant={incident.threatLevel === ThreatLevel.HIGH ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {incident.threatLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{incident.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        {new Date(incident.reportedAt).toLocaleTimeString()}
                      </span>
                      <Badge className={
                        incident.status === IncidentStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' :
                        incident.status === IncidentStatus.OPEN ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {incident.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-3">
                <ChevronRight className="h-4 w-4 mr-2" />
                View All Incidents
              </Button>
            </CardContent>
          )}
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'health' ? null : 'health')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">System Health</CardTitle>
              {expandedSection === 'health' ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </div>
          </CardHeader>
          {expandedSection === 'health' && (
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Server className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Security Services</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">ONLINE</Badge>
                </div>

                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Database Security</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">SECURE</Badge>
                </div>

                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Network className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Network Monitoring</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">SCANNING</Badge>
                </div>

                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Key Management</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">ACTIVE</Badge>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Quick Analytics */}
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'analytics' ? null : 'analytics')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Security Analytics</CardTitle>
              {expandedSection === 'analytics' ? 
                <ChevronUp className="h-4 w-4" /> : 
                <ChevronDown className="h-4 w-4" />
              }
            </div>
          </CardHeader>
          {expandedSection === 'analytics' && (
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Brain className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-blue-900">91.4%</div>
                    <div className="text-xs text-blue-700">AI Detection</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Target className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-purple-900">2.3%</div>
                    <div className="text-xs text-purple-700">False Positives</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Threat Detection Rate</span>
                    <span className="font-bold text-green-600">94.7%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Response Automation</span>
                    <span className="font-bold text-blue-600">68.2%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Compliance Score</span>
                    <span className="font-bold text-purple-600">92.3%</span>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Detailed Analytics
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-700">Emergency Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <div>
                  <div className="text-sm font-medium text-red-800">Security Team</div>
                  <div className="text-xs text-red-600">24/7 Incident Response</div>
                </div>
                <div className="flex space-x-1">
                  <Button size="sm" variant="outline" className="p-2">
                    <Phone className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-2">
                    <Mail className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                <div>
                  <div className="text-sm font-medium text-orange-800">IT Operations</div>
                  <div className="text-xs text-orange-600">System Support</div>
                </div>
                <div className="flex space-x-1">
                  <Button size="sm" variant="outline" className="p-2">
                    <Phone className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-2">
                    <Mail className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="border rounded p-2">
                  <div className="flex items-start space-x-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {alert.title}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {alert.message}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {alert.actionRequired && (
                      <Badge variant="destructive" className="text-xs">
                        ACTION
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3">
              <Bell className="h-4 w-4 mr-2" />
              View All Alerts
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}