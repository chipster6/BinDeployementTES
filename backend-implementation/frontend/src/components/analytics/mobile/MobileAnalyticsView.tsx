'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone,
  Menu,
  Truck,
  MapPin,
  Clock,
  Fuel,
  CheckCircle,
  AlertTriangle,
  Activity,
  BarChart3,
  Users,
  Package,
  Navigation,
  Refresh,
  Phone,
  Calendar,
  Target,
  TrendingUp,
  Eye,
  Filter
} from 'lucide-react';
import { MetricCard, RealTimeIndicator } from '../charts';
import { useOperationalMetrics, useFleetMetrics } from '@/hooks/useAnalyticsAPI';
import { useAnalyticsWebSocket } from '@/hooks/useAnalyticsWebSocket';

interface MobileAnalyticsViewProps {
  userRole: 'driver' | 'dispatcher' | 'field_manager' | 'admin';
  className?: string;
}

interface MobileMetric {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  status: 'normal' | 'warning' | 'critical';
  trend?: number;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  urgent?: boolean;
}

export default function MobileAnalyticsView({ userRole, className = '' }: MobileAnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // API hooks for data
  const { data: operationalData, loading: operationalLoading, refetch: refetchOperational } = useOperationalMetrics();
  const { data: fleetData, loading: fleetLoading, refetch: refetchFleet } = useFleetMetrics();
  
  // WebSocket for real-time updates
  const { isConnected, data: wsData } = useAnalyticsWebSocket({
    autoConnect: true,
    subscriptions: ['mobile-metrics', 'fleet-status', 'alerts']
  });

  // Mock data for demonstration
  const [mobileMetrics, setMobileMetrics] = useState<MobileMetric[]>([
    {
      id: 'route-progress',
      title: 'Route Progress',
      value: 75,
      unit: '%',
      status: 'normal',
      trend: 5,
      icon: <Navigation className="h-4 w-4" />,
      priority: 'high'
    },
    {
      id: 'collections-today',
      title: 'Collections',
      value: 24,
      unit: 'completed',
      status: 'normal',
      trend: 8,
      icon: <Package className="h-4 w-4" />,
      priority: 'high'
    },
    {
      id: 'fuel-level',
      title: 'Fuel Level',
      value: 68,
      unit: '%',
      status: 'warning',
      trend: -12,
      icon: <Fuel className="h-4 w-4" />,
      priority: 'medium'
    },
    {
      id: 'next-collection',
      title: 'Next Collection',
      value: '2:45 PM',
      status: 'normal',
      icon: <Clock className="h-4 w-4" />,
      priority: 'high'
    }
  ]);

  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    {
      id: 'call-dispatch',
      title: 'Call Dispatch',
      description: 'Contact dispatch center',
      icon: <Phone className="h-4 w-4" />,
      action: () => window.open('tel:+1234567890'),
    },
    {
      id: 'report-issue',
      title: 'Report Issue',
      description: 'Report vehicle or route issue',
      icon: <AlertTriangle className="h-4 w-4" />,
      action: () => console.log('Report issue'),
      urgent: true
    },
    {
      id: 'view-schedule',
      title: 'View Schedule',
      description: 'Today\'s collection schedule',
      icon: <Calendar className="h-4 w-4" />,
      action: () => console.log('View schedule'),
    },
    {
      id: 'navigation',
      title: 'Navigation',
      description: 'Get directions to next stop',
      icon: <MapPin className="h-4 w-4" />,
      action: () => console.log('Open navigation'),
    }
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchOperational(), refetchFleet()]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getRoleSpecificMetrics = () => {
    switch (userRole) {
      case 'driver':
        return mobileMetrics.filter(m => ['route-progress', 'collections-today', 'fuel-level', 'next-collection'].includes(m.id));
      case 'dispatcher':
        return mobileMetrics.filter(m => ['collections-today', 'fuel-level'].includes(m.id));
      case 'field_manager':
        return mobileMetrics;
      default:
        return mobileMetrics;
    }
  };

  const getRoleSpecificActions = () => {
    switch (userRole) {
      case 'driver':
        return quickActions;
      case 'dispatcher':
        return quickActions.filter(a => !['call-dispatch'].includes(a.id));
      case 'field_manager':
        return quickActions.filter(a => !['call-dispatch', 'navigation'].includes(a.id));
      default:
        return quickActions;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      default: return 'border-l-blue-500';
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Analytics Menu</SheetTitle>
                  <SheetDescription>
                    Quick access to analytics and controls
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
                    {getRoleSpecificActions().map((action) => (
                      <Button
                        key={action.id}
                        variant="ghost"
                        className="w-full justify-start h-auto p-3"
                        onClick={() => {
                          action.action();
                          setIsMenuOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          {action.icon}
                          <div className="text-left">
                            <div className="font-medium">{action.title}</div>
                            <div className="text-xs text-gray-600">{action.description}</div>
                          </div>
                          {action.urgent && (
                            <Badge className="bg-red-100 text-red-800 text-xs">Urgent</Badge>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-600 capitalize">{userRole.replace('_', ' ')} View</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-600">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <Refresh className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="p-4 space-y-6">
        {/* Critical Alerts */}
        <div className="space-y-2">
          {mobileMetrics.filter(m => m.status === 'critical').length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Critical Alert</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  {mobileMetrics.filter(m => m.status === 'critical').length} issues require immediate attention
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-4">
          {getRoleSpecificMetrics().map((metric) => (
            <Card 
              key={metric.id} 
              className={`border-l-4 ${getPriorityColor(metric.priority)} ${
                metric.status === 'critical' ? 'bg-red-50 border-red-200' :
                metric.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {metric.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{metric.title}</p>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-2xl font-bold text-gray-900">
                          {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                        </span>
                        {metric.unit && (
                          <span className="text-sm text-gray-600">{metric.unit}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <Badge className={getStatusColor(metric.status)}>
                      {metric.status}
                    </Badge>
                    {metric.trend !== undefined && (
                      <div className={`text-sm font-medium ${
                        metric.trend > 0 ? 'text-green-600' : 
                        metric.trend < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {metric.trend > 0 ? '+' : ''}{metric.trend}%
                      </div>
                    )}
                  </div>
                </div>
                
                {metric.id === 'route-progress' && typeof metric.value === 'number' && (
                  <div className="mt-3">
                    <Progress value={metric.value} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Real-Time Indicators */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Live Status</h2>
          
          <RealTimeIndicator
            title="Vehicle Status"
            type="status"
            initialValue="Active"
            colorScheme="green"
            thresholds={{ warning: 1, critical: 2 }}
            refreshInterval={10000}
            icon={<Truck className="h-4 w-4" />}
          />

          <RealTimeIndicator
            title="Collections Rate"
            type="counter"
            initialValue={24}
            unit="per hour"
            colorScheme="blue"
            thresholds={{ warning: 15, critical: 10 }}
            refreshInterval={5000}
            icon={<Package className="h-4 w-4" />}
            showHistory={true}
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {getRoleSpecificActions().map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={action.action}
              >
                {action.icon}
                <span className="text-sm font-medium">{action.title}</span>
                {action.urgent && (
                  <Badge className="bg-red-100 text-red-800 text-xs">Urgent</Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Role-Specific Sections */}
        {userRole === 'driver' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Today's Route</h2>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Route RT-007</span>
                  <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">14/18 stops</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
                <div className="text-sm text-gray-600">
                  <div>Next: Downtown Plaza - Bin #D-447</div>
                  <div>ETA: 2:45 PM</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {userRole === 'dispatcher' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Fleet Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">12</div>
                  <div className="text-sm text-gray-600">Active Routes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">15</div>
                  <div className="text-sm text-gray-600">Drivers On Duty</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* System Status Footer */}
        <div className="pb-safe">
          <Card className="bg-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700">System Status</span>
                </div>
                <Badge className="bg-green-100 text-green-800">All Systems Operational</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}