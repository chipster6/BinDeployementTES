'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  MapPin, 
  Truck, 
  Users, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  Calendar,
  Eye,
  Bell
} from 'lucide-react';

interface RealTimeMetrics {
  activeRoutes: number;
  completedCollections: number;
  pendingCollections: number;
  driversOnDuty: number;
  averageCollectionTime: number;
  routeEfficiency: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  alertsCount: number;
}

interface RouteStatus {
  id: string;
  driver: string;
  vehicle: string;
  progress: number;
  collectionsTotal: number;
  collectionsCompleted: number;
  estimatedCompletion: string;
  status: 'active' | 'delayed' | 'completed' | 'incident';
  currentLocation: string;
  nextLocation: string;
}

interface PerformanceMetric {
  name: string;
  current: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export default function OperationsAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    activeRoutes: 12,
    completedCollections: 89,
    pendingCollections: 23,
    driversOnDuty: 15,
    averageCollectionTime: 4.2,
    routeEfficiency: 87.3,
    systemHealth: 'good',
    alertsCount: 3
  });

  const [routes, setRoutes] = useState<RouteStatus[]>([
    {
      id: 'RT-001',
      driver: 'Mike Johnson',
      vehicle: 'TRK-007',
      progress: 75,
      collectionsTotal: 18,
      collectionsCompleted: 14,
      estimatedCompletion: '3:45 PM',
      status: 'active',
      currentLocation: 'Downtown Plaza',
      nextLocation: 'City Center Mall'
    },
    {
      id: 'RT-002',
      driver: 'Sarah Williams',
      vehicle: 'TRK-003',
      progress: 92,
      collectionsTotal: 22,
      collectionsCompleted: 20,
      estimatedCompletion: '2:30 PM',
      status: 'active',
      currentLocation: 'Industrial District',
      nextLocation: 'Warehouse Complex'
    },
    {
      id: 'RT-003',
      driver: 'David Chen',
      vehicle: 'TRK-012',
      progress: 45,
      collectionsTotal: 16,
      collectionsCompleted: 7,
      estimatedCompletion: '5:15 PM',
      status: 'delayed',
      currentLocation: 'Residential Area A',
      nextLocation: 'Residential Area B'
    }
  ]);

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
    {
      name: 'Collection Rate',
      current: 18.5,
      target: 20,
      unit: 'per hour',
      trend: 'up',
      status: 'good'
    },
    {
      name: 'Route Optimization',
      current: 87.3,
      target: 90,
      unit: '%',
      trend: 'up',
      status: 'good'
    },
    {
      name: 'Fuel Efficiency',
      current: 8.4,
      target: 9.0,
      unit: 'mpg',
      trend: 'stable',
      status: 'warning'
    },
    {
      name: 'Customer Satisfaction',
      current: 4.7,
      target: 4.5,
      unit: '/5.0',
      trend: 'up',
      status: 'excellent'
    }
  ]);

  const [isLiveMode, setIsLiveMode] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (isLiveMode) {
      const interval = setInterval(() => {
        setLastUpdated(new Date());
        // Simulate real-time updates
        setMetrics(prev => ({
          ...prev,
          completedCollections: prev.completedCollections + Math.random() > 0.7 ? 1 : 0,
          pendingCollections: Math.max(0, prev.pendingCollections + (Math.random() > 0.5 ? -1 : 0))
        }));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isLiveMode]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'delayed': return 'text-orange-600 bg-orange-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'incident': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4" />;
      case 'delayed': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'incident': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operations Analytics</h1>
          <p className="text-lg text-gray-600 mt-1">
            Real-time operational performance monitoring and insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isLiveMode ? 'Live' : 'Paused'} • Updated {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          <Button 
            variant={isLiveMode ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsLiveMode(!isLiveMode)}
            className="h-9"
          >
            <Zap className="h-4 w-4 mr-2" />
            {isLiveMode ? 'Live Mode' : 'Start Live'}
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Eye className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
      </div>

      {/* Real-Time Status Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-800">Active Routes</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-2">{metrics.activeRoutes}</div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">All routes operational</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-800">Collections Today</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-2">{metrics.completedCollections}</div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-green-700">{metrics.pendingCollections} remaining</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(metrics.completedCollections / (metrics.completedCollections + metrics.pendingCollections)) * 100}%` 
                }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-purple-800">Efficiency Score</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-2">{metrics.routeEfficiency}%</div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-purple-700">Above target</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-orange-800">System Health</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-900 mb-2 capitalize">{metrics.systemHealth}</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-700">
                {metrics.alertsCount} active alerts
              </span>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Bell className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="realtime" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="realtime">Real-Time Operations</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="routes">Route Management</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Live Route Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <span>Live Route Status</span>
                </CardTitle>
                <CardDescription>Real-time tracking of active collection routes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {routes.map((route) => (
                    <div key={route.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(route.status)}>
                            {getStatusIcon(route.status)}
                            <span className="ml-1 capitalize">{route.status}</span>
                          </Badge>
                          <span className="font-medium text-gray-900">{route.id}</span>
                        </div>
                        <span className="text-sm text-gray-600">{route.estimatedCompletion}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Driver:</span>
                          <span className="font-medium text-gray-900 ml-1">{route.driver}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Vehicle:</span>
                          <span className="font-medium text-gray-900 ml-1">{route.vehicle}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            {route.collectionsCompleted}/{route.collectionsTotal} collections
                          </span>
                        </div>
                        <Progress value={route.progress} className="h-2" />
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>Current: {route.currentLocation}</span>
                        <span>→</span>
                        <span>Next: {route.nextLocation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <span>Performance Indicators</span>
                </CardTitle>
                <CardDescription>Key operational metrics and targets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics.map((metric, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{metric.name}</span>
                        <div className="flex items-center space-x-2">
                          {getTrendIcon(metric.trend)}
                          <Badge className={getStatusColor(metric.status)}>
                            {metric.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-gray-900">
                          {metric.current} <span className="text-sm font-normal text-gray-600">{metric.unit}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Target: {metric.target} {metric.unit}
                        </div>
                      </div>

                      <Progress 
                        value={(metric.current / metric.target) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-Time Map Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                <span>Live Fleet Tracking</span>
              </CardTitle>
              <CardDescription>Real-time geospatial view of fleet operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg flex items-center justify-center border-2 border-dashed border-purple-200">
                <div className="text-center space-y-2">
                  <MapPin className="h-16 w-16 text-purple-400 mx-auto" />
                  <p className="text-lg font-medium text-purple-700">Interactive Fleet Map</p>
                  <p className="text-sm text-purple-600">Mapbox/Google Maps integration with real-time vehicle tracking</p>
                  <div className="flex justify-center space-x-4 mt-4">
                    <Badge className="bg-green-100 text-green-800">12 Active Routes</Badge>
                    <Badge className="bg-blue-100 text-blue-800">15 Vehicles</Badge>
                    <Badge className="bg-purple-100 text-purple-800">Live GPS Tracking</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Collection Performance</CardTitle>
                <CardDescription>Hourly collection rates and efficiency trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                  <div className="text-center space-y-2">
                    <BarChart3 className="h-12 w-12 text-blue-400 mx-auto" />
                    <p className="text-sm font-medium text-blue-700">Performance Trend Chart</p>
                    <p className="text-xs text-blue-600">Real-time collection efficiency visualization</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>Fleet and driver utilization metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Driver Utilization</span>
                      <span className="font-medium">87.5%</span>
                    </div>
                    <Progress value={87.5} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Vehicle Utilization</span>
                      <span className="font-medium">83.2%</span>
                    </div>
                    <Progress value={83.2} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Route Optimization</span>
                      <span className="font-medium">91.7%</span>
                    </div>
                    <Progress value={91.7} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Route Optimization Analysis</CardTitle>
                <CardDescription>AI-powered route efficiency and optimization recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Distance Saved</span>
                      <Badge className="bg-green-100 text-green-800">Daily</Badge>
                    </div>
                    <div className="text-2xl font-bold text-green-600">15.2%</div>
                    <p className="text-xs text-gray-600">45.7 miles saved today</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Time Efficiency</span>
                      <Badge className="bg-blue-100 text-blue-800">Real-time</Badge>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">23 min</div>
                    <p className="text-xs text-gray-600">Average time per collection</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Fuel Savings</span>
                      <Badge className="bg-purple-100 text-purple-800">Projected</Badge>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">$127</div>
                    <p className="text-xs text-gray-600">Daily fuel cost savings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span>Active Alerts</span>
                </CardTitle>
                <CardDescription>Current operational issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-3">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">Route RT-003 Delayed</p>
                        <p className="text-sm text-red-600">45 minutes behind schedule</p>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800">High Priority</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">Vehicle TRK-012 Maintenance Due</p>
                        <p className="text-sm text-yellow-600">Scheduled maintenance required within 2 days</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Medium Priority</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">Customer Request - Extra Pickup</p>
                        <p className="text-sm text-blue-600">Downtown Plaza - Bin #D-447</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Low Priority</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}