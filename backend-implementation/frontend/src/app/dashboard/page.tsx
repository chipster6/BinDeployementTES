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
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.first_name}!
            </h2>
            <p className="text-muted-foreground">
              Here's what's happening with your waste management operations.
            </p>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Routes</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">2 completed, 1 in progress</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bins Collected</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">+12 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Collection</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2:30 PM</div>
            <p className="text-xs text-muted-foreground">Downtown Plaza - Bin #D-447</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Route Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground">Estimated finish: 4:45 PM</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Route */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Route</CardTitle>
            <CardDescription>Today's collection schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Main Street Plaza</p>
                <p className="text-sm text-muted-foreground">Bin #M-223 • Completed at 10:30 AM</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">City Center Mall</p>
                <p className="text-sm text-muted-foreground">Bin #C-445 • Completed at 11:15 AM</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white"></div>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-medium">Downtown Plaza</p>
                <p className="text-sm text-muted-foreground">Bin #D-447 • Next collection</p>
              </div>
              <Badge variant="outline" className="text-blue-600">Current</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Status</CardTitle>
            <CardDescription>Truck #TRK-007</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fuel Level</span>
              <span className="text-sm">78%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Load Capacity</span>
              <span className="text-sm">45% Full</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Next Maintenance</span>
              <span className="text-sm">In 5 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant="outline" className="text-green-600">Active</Badge>
            </div>
          </CardContent>
        </Card>
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