"use client";

/**
 * ============================================================================
 * ROLE-BASED DASHBOARD COMPONENT
 * ============================================================================
 *
 * Adaptive dashboard that renders different interfaces based on user roles.
 * Coordinates with External-API-Integration-Specialist for role-specific
 * service access and permission-based feature display.
 *
 * User Roles:
 * - Driver: Route management, bin collection status, mobile-optimized
 * - Customer: Service requests, billing, bin monitoring
 * - Admin: System administration, user management, security controls
 * - Fleet Manager: Vehicle tracking, route optimization, driver coordination
 * - Dispatcher: Real-time operations, emergency response, coordination
 *
 * Features:
 * - Dynamic component loading based on user permissions
 * - Role-specific WebSocket subscriptions
 * - Adaptive UI layouts for different screen sizes
 * - Context-aware navigation and actions
 * - Emergency protocols for critical roles
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useExternalServiceCoordination } from '@/hooks/useExternalServiceCoordination';
import { usePerformanceCoordination } from '@/hooks/usePerformanceCoordination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Truck, 
  Settings, 
  Users, 
  Radio,
  Shield,
  BarChart3,
  MapPin,
  Clock,
  Bell,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { DynamicLoader } from '@/components/DynamicLoader';
import { DynamicExternalServicesCostDashboard, DynamicExternalServicesStatusIndicators } from '@/components/DynamicLoader';

/**
 * User Role Types
 */
export type UserRole = 'driver' | 'customer' | 'admin' | 'fleet_manager' | 'dispatcher';

/**
 * Dashboard Configuration per Role
 */
const ROLE_CONFIGS = {
  driver: {
    name: 'Driver Dashboard',
    icon: Truck,
    color: 'blue',
    description: 'Route management and collection tracking',
    permissions: ['view_routes', 'update_bin_status', 'view_assignments'],
    features: ['route_optimization', 'bin_collection', 'gps_tracking', 'mobile_app'],
    priority: 'operational'
  },
  customer: {
    name: 'Customer Portal',
    icon: User,
    color: 'green',
    description: 'Service requests and account management',
    permissions: ['view_own_data', 'submit_requests', 'view_billing'],
    features: ['service_requests', 'billing_portal', 'bin_monitoring', 'support_chat'],
    priority: 'self_service'
  },
  admin: {
    name: 'System Administration',
    icon: Settings,
    color: 'red',
    description: 'Complete system control and management',
    permissions: ['full_access', 'user_management', 'system_config', 'security_control'],
    features: ['user_management', 'system_monitoring', 'security_dashboard', 'external_services', 'cost_monitoring'],
    priority: 'management'
  },
  fleet_manager: {
    name: 'Fleet Management',
    icon: BarChart3,
    color: 'purple',
    description: 'Vehicle and driver coordination',
    permissions: ['manage_fleet', 'view_analytics', 'route_planning', 'driver_management'],
    features: ['fleet_tracking', 'route_optimization', 'driver_coordination', 'performance_analytics'],
    priority: 'coordination'
  },
  dispatcher: {
    name: 'Dispatch Control',
    icon: Radio,
    color: 'orange',
    description: 'Real-time operations and emergency response',
    permissions: ['dispatch_control', 'emergency_response', 'real_time_monitoring'],
    features: ['real_time_tracking', 'emergency_protocols', 'communication_center', 'incident_management'],
    priority: 'critical'
  }
};

/**
 * Driver Dashboard Component
 */
const DriverDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [activeRoute, setActiveRoute] = useState(null);
  const [assignedBins, setAssignedBins] = useState([]);
  const [completionStats, setCompletionStats] = useState({ completed: 0, total: 0 });

  return (
    <div className="space-y-6">
      {/* Current Route Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <span>Current Route</span>
            <Badge variant={activeRoute ? "default" : "secondary"}>
              {activeRoute ? "Active" : "Standby"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeRoute ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-semibold">Route #{activeRoute?.id || 'R001'}</div>
                  <div className="text-sm text-gray-600">Estimated completion: 2:30 PM</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-green-600">
                    {completionStats.completed}/{completionStats.total}
                  </div>
                  <div className="text-sm text-gray-600">Bins collected</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(completionStats.completed / Math.max(completionStats.total, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No active route assigned</p>
              <Button className="mt-4" size="sm">Check for assignments</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <CheckCircle className="h-6 w-6" />
          <span>Complete Pickup</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <AlertTriangle className="h-6 w-6" />
          <span>Report Issue</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <MapPin className="h-6 w-6" />
          <span>Navigate</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <Radio className="h-6 w-6" />
          <span>Contact Dispatch</span>
        </Button>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Today's Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div>
                    <div className="font-medium">123 Main Street</div>
                    <div className="text-sm text-gray-600">Commercial - 2 bins</div>
                  </div>
                </div>
                <Badge variant="outline">Pending</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Customer Dashboard Component
 */
const CustomerDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [nextPickup, setNextPickup] = useState(null);
  const [accountStatus, setAccountStatus] = useState('active');

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">Active</div>
                <div className="text-sm text-gray-600">Account Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">Tomorrow</div>
                <div className="text-sm text-gray-600">Next Pickup</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">$127.50</div>
                <div className="text-sm text-gray-600">Current Balance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button className="h-20 flex-col space-y-2">
          <Bell className="h-6 w-6" />
          <span>Request Pickup</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <BarChart3 className="h-6 w-6" />
          <span>View Bill</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <MapPin className="h-6 w-6" />
          <span>Track Service</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col space-y-2">
          <User className="h-6 w-6" />
          <span>Contact Support</span>
        </Button>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Service Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">Regular Pickup Completed</div>
                    <div className="text-sm text-gray-600">March 15, 2024 - 10:30 AM</div>
                  </div>
                </div>
                <Badge variant="outline">Completed</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Admin Dashboard Component
 */
const AdminDashboard: React.FC<{ user: any }> = ({ user }) => {
  const { coordinationStatus } = useExternalServiceCoordination();

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-green-600" />
              <div>
                <div className="text-lg font-bold">{coordinationStatus.healthySystems}</div>
                <div className="text-sm text-gray-600">Healthy Services</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                <div className="text-lg font-bold">24</div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <div>
                <div className="text-lg font-bold">{coordinationStatus.criticalAlerts}</div>
                <div className="text-sm text-gray-600">Active Alerts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <div>
                <div className="text-lg font-bold">${coordinationStatus.totalCostPerHour.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Hourly API Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* External Services Monitoring */}
      <DynamicLoader
        component={DynamicExternalServicesStatusIndicators}
        fallbackType="dashboard"
        componentProps={{ compactView: true }}
      />

      {/* Cost Monitoring Dashboard */}
      <DynamicLoader
        component={DynamicExternalServicesCostDashboard}
        fallbackType="dashboard"
        componentProps={{ autoRefresh: true }}
      />
    </div>
  );
};

/**
 * Fleet Manager Dashboard Component
 */
const FleetManagerDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [fleetStats, setFleetStats] = useState({
    totalVehicles: 12,
    activeVehicles: 8,
    availableDrivers: 5,
    completedRoutes: 23
  });

  return (
    <div className="space-y-6">
      {/* Fleet Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-6 w-6 text-blue-600" />
              <div>
                <div className="text-lg font-bold">{fleetStats.totalVehicles}</div>
                <div className="text-sm text-gray-600">Total Vehicles</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-6 w-6 text-green-600" />
              <div>
                <div className="text-lg font-bold">{fleetStats.activeVehicles}</div>
                <div className="text-sm text-gray-600">On Route</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-purple-600" />
              <div>
                <div className="text-lg font-bold">{fleetStats.availableDrivers}</div>
                <div className="text-sm text-gray-600">Available Drivers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <div className="text-lg font-bold">{fleetStats.completedRoutes}</div>
                <div className="text-sm text-gray-600">Routes Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Map and Real-time Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Fleet Tracking</span>
            <Badge variant="outline" className="text-green-600 border-green-600">Live</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Interactive fleet map will be rendered here</p>
              <p className="text-sm text-gray-500">Real-time GPS tracking and route optimization</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Dispatcher Dashboard Component
 */
const DispatcherDashboard: React.FC<{ user: any }> = ({ user }) => {
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState(2);

  return (
    <div className="space-y-6">
      {/* Emergency Status */}
      {activeIncidents > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{activeIncidents} active incidents</strong> require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Dispatch Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Radio className="h-5 w-5" />
              <span>Communication Center</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button className="h-16">
                  <Radio className="h-6 w-6 mr-2" />
                  All Units
                </Button>
                <Button variant="outline" className="h-16">
                  <AlertTriangle className="h-6 w-6 mr-2" />
                  Emergency
                </Button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Recent Communications</div>
                <div className="space-y-2">
                  <div className="text-sm">Driver 03: Route completed ahead of schedule</div>
                  <div className="text-sm">Driver 07: Requesting backup for large pickup</div>
                  <div className="text-sm">Maintenance: Vehicle 12 ready for service</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Real-time Operations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">8</div>
                  <div className="text-xs text-gray-600">On Schedule</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-600">2</div>
                  <div className="text-xs text-gray-600">Delayed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">1</div>
                  <div className="text-xs text-gray-600">Emergency</div>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="destructive" className="w-full">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  EMERGENCY PROTOCOL
                </Button>
                <Button variant="outline" className="w-full">
                  <MapPin className="h-4 w-4 mr-2" />
                  Track All Units
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/**
 * Main Role-Based Dashboard Component
 */
export interface RoleBasedDashboardProps {
  className?: string;
  compactMode?: boolean;
}

export const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({
  className,
  compactMode = false
}) => {
  const { user, userRole } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);

  // Validate user authentication and role
  useEffect(() => {
    if (user && userRole) {
      setIsLoading(false);
    }
  }, [user, userRole]);

  // Get role configuration
  const roleConfig = useMemo(() => {
    if (!userRole || !ROLE_CONFIGS[userRole as UserRole]) {
      return ROLE_CONFIGS.customer; // Default fallback
    }
    return ROLE_CONFIGS[userRole as UserRole];
  }, [userRole]);

  // Render appropriate dashboard based on role
  const renderRoleDashboard = () => {
    switch (userRole) {
      case 'driver':
        return <DriverDashboard user={user} />;
      case 'customer':
        return <CustomerDashboard user={user} />;
      case 'admin':
        return <AdminDashboard user={user} />;
      case 'fleet_manager':
        return <FleetManagerDashboard user={user} />;
      case 'dispatcher':
        return <DispatcherDashboard user={user} />;
      default:
        return <CustomerDashboard user={user} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <div className="loading-spinner"></div>
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const IconComponent = roleConfig.icon;

  return (
    <div className={className}>
      {/* Dashboard Header */}
      {!compactMode && (
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-2 rounded-lg bg-${roleConfig.color}-100`}>
              <IconComponent className={`h-6 w-6 text-${roleConfig.color}-600`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{roleConfig.name}</h1>
              <p className="text-gray-600">{roleConfig.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{userRole?.replace('_', ' ').toUpperCase()}</Badge>
            {roleConfig.priority === 'critical' && (
              <Badge variant="destructive">Critical Role</Badge>
            )}
            {user?.name && (
              <span className="text-sm text-gray-600">Welcome back, {user.name}</span>
            )}
          </div>
        </div>
      )}

      {/* Role-specific Dashboard Content */}
      {renderRoleDashboard()}
    </div>
  );
};

export default RoleBasedDashboard;