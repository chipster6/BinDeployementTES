'use client';

import React, { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { 
  Truck, 
  Users, 
  Trash2, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  Package
} from 'lucide-react';

interface DashboardStats {
  totalBins: number;
  activeBins: number;
  completedCollections: number;
  pendingCollections: number;
  totalCustomers: number;
  activeDrivers: number;
  totalRevenue: number;
  newTickets: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBins: 1247,
    activeBins: 1180,
    completedCollections: 89,
    pendingCollections: 23,
    totalCustomers: 312,
    activeDrivers: 15,
    totalRevenue: 45650,
    newTickets: 7
  });

  // Get role-specific dashboard content
  const getDashboardContent = () => {
    if (!user) return null;

    switch (user.role) {
      case UserRole.DRIVER:
        return <DriverDashboard stats={stats} />;
      case UserRole.CUSTOMER:
      case UserRole.CUSTOMER_STAFF:
        return <CustomerDashboard stats={stats} />;
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return <AdminDashboard stats={stats} />;
      case UserRole.DISPATCHER:
        return <DispatcherDashboard stats={stats} />;
      case UserRole.OFFICE_STAFF:
        return <OfficeDashboard stats={stats} />;
      default:
        return <GeneralDashboard stats={stats} />;
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          <div className="animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.first_name}!
                </h1>
                <p className="text-lg text-gray-600">
                  Here's what's happening with your waste management operations.
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white/80 backdrop-blur-sm border border-green-200 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">All Systems Operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {getDashboardContent()}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Driver-specific dashboard
function DriverDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="metric-card interactive">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              +2 today
            </div>
          </div>
          <div className="metric-value">3</div>
          <div className="metric-label">Today's Routes</div>
          <p className="text-xs text-gray-500 mt-1">2 completed, 1 in progress</p>
        </div>
        
        <div className="metric-card interactive">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Trash2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              +12
            </div>
          </div>
          <div className="metric-value">47</div>
          <div className="metric-label">Bins Collected</div>
          <p className="text-xs text-green-600 font-medium mt-1">+12 from yesterday</p>
        </div>

        <div className="metric-card interactive">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
              30 min
            </div>
          </div>
          <div className="metric-value">2:30 PM</div>
          <div className="metric-label">Next Collection</div>
          <p className="text-xs text-gray-500 mt-1">Downtown Plaza - Bin #D-447</p>
        </div>

        <div className="metric-card interactive">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              On track
            </div>
          </div>
          <div className="metric-value">78%</div>
          <div className="metric-label">Route Progress</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{width: '78%'}}></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Estimated finish: 4:45 PM</p>
        </div>
      </div>

      {/* Current Route */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-enhanced p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Route</h3>
              <p className="text-sm text-gray-600">Today's collection schedule</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Main Street Plaza</p>
                <p className="text-sm text-gray-600">Bin #M-223 • Completed at 10:30 AM</p>
              </div>
              <div className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                Completed
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">City Center Mall</p>
                <p className="text-sm text-gray-600">Bin #C-445 • Completed at 11:15 AM</p>
              </div>
              <div className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                Completed
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-pulse">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Downtown Plaza</p>
                <p className="text-sm text-gray-600">Bin #D-447 • Next collection</p>
              </div>
              <div className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full animate-pulse">
                Current
              </div>
            </div>
          </div>
        </div>

        <div className="card-enhanced p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Vehicle Status</h3>
              <p className="text-sm text-gray-600">Truck #TRK-007</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Truck className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Fuel Level</span>
                <span className="text-sm font-semibold text-gray-900">78%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{width: '78%'}}></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Load Capacity</span>
                <span className="text-sm font-semibold text-gray-900">45% Full</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{width: '45%'}}></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Next Maintenance</span>
              <span className="text-sm font-semibold text-gray-900">In 5 days</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-700">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Customer-specific dashboard
function CustomerDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Bins</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">All active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Collection</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Tomorrow</div>
            <p className="text-xs text-muted-foreground">10:00 AM - 2:00 PM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Bill</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,247</div>
            <p className="text-xs text-muted-foreground">Due Dec 15, 2024</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Requests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">1 pending, 1 in progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Collections</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium">Bin #001 - Main Entrance</p>
                <p className="text-sm text-muted-foreground">Collected yesterday at 2:15 PM</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium">Bin #002 - Loading Dock</p>
                <p className="text-sm text-muted-foreground">Collected 2 days ago at 11:30 AM</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Extra Pickup
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Issue
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              View Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Admin dashboard with full overview
function AdminDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bins</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBins}</div>
            <p className="text-xs text-muted-foreground">of {stats.totalBins} total bins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDrivers}</div>
            <p className="text-xs text-muted-foreground">All drivers on duty</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newTickets}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Operations</CardTitle>
            <CardDescription>Real-time system status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Collections Completed</span>
              <Badge variant="outline" className="text-green-600">{stats.completedCollections}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Collections Pending</span>
              <Badge variant="outline" className="text-orange-600">{stats.pendingCollections}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Status</span>
              <Badge variant="outline" className="text-green-600">All Systems Online</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Overview</CardTitle>
            <CardDescription>Customer base analytics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Customers</span>
              <span className="text-sm font-bold">{stats.totalCustomers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Subscriptions</span>
              <span className="text-sm">287</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Satisfaction Rate</span>
              <span className="text-sm">94.2%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Dispatcher dashboard
function DispatcherDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      {/* Route Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">3 completed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drivers On Duty</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDrivers}</div>
            <p className="text-xs text-muted-foreground">All assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehicle Fleet</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">2 in maintenance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Office staff dashboard
function OfficeDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      {/* Customer Service Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Tickets</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newTickets}</div>
            <p className="text-xs text-muted-foreground">3 high priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">+5 new this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">Pending payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCollections}</div>
            <p className="text-xs text-muted-foreground">Completed today</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// General fallback dashboard
function GeneralDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <AdminDashboard stats={stats} />
  );
}