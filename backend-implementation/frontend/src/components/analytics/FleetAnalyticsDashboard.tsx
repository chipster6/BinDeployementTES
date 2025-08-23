'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Truck, 
  Fuel, 
  Settings, 
  MapPin, 
  Users, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Route,
  Navigation,
  Gauge,
  Wrench,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

interface Vehicle {
  id: string;
  name: string;
  type: 'truck' | 'van' | 'compactor';
  status: 'active' | 'maintenance' | 'idle' | 'offline';
  driver: string;
  currentRoute: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  fuel: {
    level: number;
    efficiency: number;
    consumption: number;
  };
  maintenance: {
    nextDue: string;
    score: number;
    issues: number;
  };
  performance: {
    utilization: number;
    collections: number;
    mileage: number;
  };
}

interface FleetMetrics {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  averageFuelEfficiency: number;
  totalMileage: number;
  utilizationRate: number;
  maintenanceScore: number;
  operationalCost: number;
}

interface GeospatialData {
  routes: Array<{
    id: string;
    name: string;
    coordinates: Array<[number, number]>;
    status: 'active' | 'completed' | 'planned';
    vehicle: string;
    efficiency: number;
  }>;
  serviceAreas: Array<{
    id: string;
    name: string;
    bounds: Array<[number, number]>;
    coverage: number;
    demand: 'high' | 'medium' | 'low';
  }>;
  heatmapData: Array<{
    lat: number;
    lng: number;
    intensity: number;
    type: 'collection' | 'demand' | 'traffic';
  }>;
}

export default function FleetAnalyticsDashboard() {
  const [fleetMetrics, setFleetMetrics] = useState<FleetMetrics>({
    totalVehicles: 18,
    activeVehicles: 15,
    maintenanceVehicles: 2,
    averageFuelEfficiency: 8.4,
    totalMileage: 12450,
    utilizationRate: 83.5,
    maintenanceScore: 92.7,
    operationalCost: 15670
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: 'TRK-007',
      name: 'Truck Alpha',
      type: 'truck',
      status: 'active',
      driver: 'Mike Johnson',
      currentRoute: 'RT-001',
      location: {
        lat: 40.7128,
        lng: -74.0060,
        address: 'Downtown Plaza, NYC'
      },
      fuel: {
        level: 78,
        efficiency: 8.7,
        consumption: 45.2
      },
      maintenance: {
        nextDue: '2024-01-15',
        score: 95,
        issues: 0
      },
      performance: {
        utilization: 87,
        collections: 142,
        mileage: 1247
      }
    },
    {
      id: 'TRK-003',
      name: 'Truck Beta',
      type: 'truck',
      status: 'active',
      driver: 'Sarah Williams',
      currentRoute: 'RT-002',
      location: {
        lat: 40.7589,
        lng: -73.9851,
        address: 'Central Park Area, NYC'
      },
      fuel: {
        level: 65,
        efficiency: 8.2,
        consumption: 52.1
      },
      maintenance: {
        nextDue: '2024-01-20',
        score: 88,
        issues: 1
      },
      performance: {
        utilization: 92,
        collections: 167,
        mileage: 1456
      }
    },
    {
      id: 'TRK-012',
      name: 'Truck Gamma',
      type: 'compactor',
      status: 'maintenance',
      driver: 'Unassigned',
      currentRoute: 'None',
      location: {
        lat: 40.7505,
        lng: -73.9934,
        address: 'Maintenance Facility'
      },
      fuel: {
        level: 45,
        efficiency: 7.8,
        consumption: 0
      },
      maintenance: {
        nextDue: '2024-01-10',
        score: 65,
        issues: 3
      },
      performance: {
        utilization: 0,
        collections: 0,
        mileage: 0
      }
    }
  ]);

  const [geospatialData, setGeospatialData] = useState<GeospatialData>({
    routes: [
      {
        id: 'RT-001',
        name: 'Downtown Route',
        coordinates: [[40.7128, -74.0060], [40.7589, -73.9851], [40.7505, -73.9934]],
        status: 'active',
        vehicle: 'TRK-007',
        efficiency: 87.3
      },
      {
        id: 'RT-002',
        name: 'Uptown Route',
        coordinates: [[40.7589, -73.9851], [40.7831, -73.9712], [40.7505, -73.9934]],
        status: 'active',
        vehicle: 'TRK-003',
        efficiency: 92.1
      }
    ],
    serviceAreas: [
      {
        id: 'SA-001',
        name: 'Manhattan Central',
        bounds: [[40.7128, -74.0060], [40.7831, -73.9712], [40.7505, -73.9934], [40.7128, -74.0060]],
        coverage: 95.2,
        demand: 'high'
      }
    ],
    heatmapData: [
      { lat: 40.7128, lng: -74.0060, intensity: 0.8, type: 'collection' },
      { lat: 40.7589, lng: -73.9851, intensity: 0.6, type: 'demand' },
      { lat: 40.7505, lng: -73.9934, intensity: 0.9, type: 'traffic' }
    ]
  });

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (isLiveTracking) {
      const interval = setInterval(() => {
        setLastUpdated(new Date());
        // Simulate real-time vehicle updates
        setVehicles(prev => prev.map(vehicle => ({
          ...vehicle,
          fuel: {
            ...vehicle.fuel,
            level: Math.max(10, vehicle.fuel.level - (Math.random() * 2))
          },
          performance: {
            ...vehicle.performance,
            collections: vehicle.status === 'active' ? 
              vehicle.performance.collections + (Math.random() > 0.8 ? 1 : 0) : 
              vehicle.performance.collections
          }
        })));
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isLiveTracking]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'maintenance': return 'text-orange-600 bg-orange-100';
      case 'idle': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'truck': return <Truck className="h-4 w-4" />;
      case 'van': return <Truck className="h-4 w-4" />;
      case 'compactor': return <Truck className="h-4 w-4" />;
      default: return <Truck className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fleet Analytics</h1>
          <p className="text-lg text-gray-600 mt-1">
            Comprehensive fleet management with geospatial intelligence and performance monitoring
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isLiveTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {isLiveTracking ? 'Live Tracking' : 'Paused'} • {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          <Button 
            variant={isLiveTracking ? "default" : "outline"} 
            size="sm" 
            onClick={() => setIsLiveTracking(!isLiveTracking)}
            className="h-9"
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isLiveTracking ? 'Live Mode' : 'Start Tracking'}
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Fleet Overview KPIs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-800">Fleet Status</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-2">
              {fleetMetrics.activeVehicles}/{fleetMetrics.totalVehicles}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Active Vehicles</span>
                <span className="font-medium text-blue-800">
                  {((fleetMetrics.activeVehicles / fleetMetrics.totalVehicles) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(fleetMetrics.activeVehicles / fleetMetrics.totalVehicles) * 100} 
                className="h-2" 
              />
              <div className="text-xs text-blue-600">
                {fleetMetrics.maintenanceVehicles} vehicles in maintenance
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-800">Fuel Efficiency</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <Fuel className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-2">
              {fleetMetrics.averageFuelEfficiency} <span className="text-lg">mpg</span>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">+0.3 mpg vs last month</span>
            </div>
            <div className="text-xs text-green-600">
              Cost savings: $1,240/month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-purple-800">Utilization Rate</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-2">
              {fleetMetrics.utilizationRate}%
            </div>
            <div className="space-y-2">
              <Progress value={fleetMetrics.utilizationRate} className="h-2" />
              <div className="text-xs text-purple-600">
                Target: 85% utilization
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-orange-800">Maintenance Score</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Settings className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 mb-2">
              {fleetMetrics.maintenanceScore}%
            </div>
            <div className="space-y-2">
              <Progress value={fleetMetrics.maintenanceScore} className="h-2" />
              <div className="text-xs text-orange-600">
                Fleet health: Excellent
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="geospatial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geospatial">Geospatial Intelligence</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Performance</TabsTrigger>
          <TabsTrigger value="routes">Route Analytics</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Management</TabsTrigger>
        </TabsList>

        <TabsContent value="geospatial" className="space-y-6">
          {/* Interactive Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span>Live Fleet Tracking & Route Optimization</span>
              </CardTitle>
              <CardDescription>
                Real-time geospatial view with route optimization and performance heatmaps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                <div className="text-center space-y-4">
                  <MapPin className="h-20 w-20 text-blue-400 mx-auto" />
                  <div>
                    <p className="text-xl font-medium text-blue-700">Interactive Fleet Map</p>
                    <p className="text-sm text-blue-600 mt-2">
                      Mapbox/Google Maps integration with real-time GPS tracking
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="flex items-center justify-center space-x-2 p-3 bg-white/80 rounded-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Active Routes</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 p-3 bg-white/80 rounded-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-700">Service Areas</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 p-3 bg-white/80 rounded-lg">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-purple-700">Traffic Data</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 p-3 bg-white/80 rounded-lg">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-medium text-orange-700">Demand Heatmap</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Geospatial Analytics */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Route className="h-5 w-5 text-green-600" />
                  <span>Route Efficiency Analysis</span>
                </CardTitle>
                <CardDescription>Performance metrics by service area and route</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {geospatialData.routes.map((route) => (
                    <div key={route.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(route.status)}>
                            <Activity className="h-3 w-3 mr-1" />
                            {route.status}
                          </Badge>
                          <span className="font-medium text-gray-900">{route.name}</span>
                        </div>
                        <span className="text-sm text-gray-600">{route.vehicle}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Route Efficiency</span>
                          <span className="font-medium">{route.efficiency}%</span>
                        </div>
                        <Progress value={route.efficiency} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-purple-600" />
                  <span>Service Area Coverage</span>
                </CardTitle>
                <CardDescription>Geographic coverage and demand analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {geospatialData.serviceAreas.map((area) => (
                    <div key={area.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{area.name}</span>
                        <Badge 
                          className={
                            area.demand === 'high' ? 'bg-red-100 text-red-800' :
                            area.demand === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }
                        >
                          {area.demand} demand
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Coverage</span>
                          <span className="font-medium">{area.coverage}%</span>
                        </div>
                        <Progress value={area.coverage} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-6">
          {/* Vehicle Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <Card 
                key={vehicle.id} 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  selectedVehicle === vehicle.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedVehicle(selectedVehicle === vehicle.id ? null : vehicle.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getVehicleIcon(vehicle.type)}
                      <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(vehicle.status)}>
                      {vehicle.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {vehicle.id} • {vehicle.location.address}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Fuel Level */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fuel Level</span>
                      <span className="font-medium">{vehicle.fuel.level.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={vehicle.fuel.level} 
                      className={`h-2 ${vehicle.fuel.level < 25 ? 'text-red-600' : ''}`}
                    />
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Utilization</span>
                      <div className="font-medium">{vehicle.performance.utilization}%</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Collections</span>
                      <div className="font-medium">{vehicle.performance.collections}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Fuel Eff.</span>
                      <div className="font-medium">{vehicle.fuel.efficiency} mpg</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Mileage</span>
                      <div className="font-medium">{vehicle.performance.mileage.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Driver and Route */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Driver</span>
                      <span className="font-medium">{vehicle.driver}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route</span>
                      <span className="font-medium">{vehicle.currentRoute}</span>
                    </div>
                  </div>

                  {/* Maintenance Indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Maintenance Score</span>
                      <span className="font-medium">{vehicle.maintenance.score}%</span>
                    </div>
                    <Progress value={vehicle.maintenance.score} className="h-2" />
                    {vehicle.maintenance.issues > 0 && (
                      <div className="flex items-center space-x-1 text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{vehicle.maintenance.issues} issue(s) reported</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Vehicle Details */}
          {selectedVehicle && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Detailed Analytics - {vehicles.find(v => v.id === selectedVehicle)?.name}
                </CardTitle>
                <CardDescription>
                  Comprehensive performance metrics and historical data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg flex items-center justify-center border-2 border-dashed border-green-200">
                    <div className="text-center space-y-2">
                      <BarChart3 className="h-12 w-12 text-green-400 mx-auto" />
                      <p className="text-sm font-medium text-green-700">Performance Trends</p>
                      <p className="text-xs text-green-600">Historical fuel efficiency and utilization</p>
                    </div>
                  </div>
                  
                  <div className="h-64 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg flex items-center justify-center border-2 border-dashed border-purple-200">
                    <div className="text-center space-y-2">
                      <Gauge className="h-12 w-12 text-purple-400 mx-auto" />
                      <p className="text-sm font-medium text-purple-700">Real-time Diagnostics</p>
                      <p className="text-xs text-purple-600">Engine metrics and system health</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="routes" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Route Optimization Performance</CardTitle>
                <CardDescription>AI-powered route optimization results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700">Distance Saved</span>
                      <div className="text-2xl font-bold text-green-600">15.2%</div>
                      <p className="text-xs text-gray-600">45.7 miles daily</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700">Time Saved</span>
                      <div className="text-2xl font-bold text-blue-600">23 min</div>
                      <p className="text-xs text-gray-600">Per route average</p>
                    </div>
                  </div>
                  
                  <div className="h-40 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                    <div className="text-center space-y-2">
                      <Route className="h-8 w-8 text-blue-400 mx-auto" />
                      <p className="text-sm font-medium text-blue-700">Route Optimization Chart</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic & Weather Impact</CardTitle>
                <CardDescription>External factors affecting route performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Rush Hour Impact</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-900">+12 min avg</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Weather Delays</span>
                    </div>
                    <span className="text-sm font-bold text-blue-900">+5 min avg</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">AI Optimization</span>
                    </div>
                    <span className="text-sm font-bold text-green-900">-18 min avg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  <span>Maintenance Schedule</span>
                </CardTitle>
                <CardDescription>Upcoming and overdue maintenance tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="font-medium text-red-800">TRK-012 - Oil Change</p>
                      <p className="text-sm text-red-600">Overdue by 3 days</p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">Critical</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <p className="font-medium text-yellow-800">TRK-007 - Brake Inspection</p>
                      <p className="text-sm text-yellow-600">Due in 5 days</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Upcoming</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="font-medium text-green-800">TRK-003 - Routine Service</p>
                      <p className="text-sm text-green-600">Due in 12 days</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Scheduled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Costs</CardTitle>
                <CardDescription>Monthly maintenance expenditure analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(fleetMetrics.operationalCost)}</div>
                    <p className="text-sm text-gray-600">Total monthly maintenance cost</p>
                  </div>
                  
                  <div className="h-32 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg flex items-center justify-center border-2 border-dashed border-orange-200">
                    <div className="text-center space-y-2">
                      <PieChart className="h-8 w-8 text-orange-400 mx-auto" />
                      <p className="text-sm font-medium text-orange-700">Cost Breakdown Chart</p>
                    </div>
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