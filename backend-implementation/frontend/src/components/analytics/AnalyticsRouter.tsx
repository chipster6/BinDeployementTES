'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  TrendingUp,
  Truck,
  DollarSign,
  Users,
  Smartphone,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// Import dashboard components
import ExecutiveAnalyticsDashboard from './ExecutiveAnalyticsDashboard';
import OperationsAnalyticsDashboard from './OperationsAnalyticsDashboard';
import FleetAnalyticsDashboard from './FleetAnalyticsDashboard';
import FinancialAnalyticsDashboard from './FinancialAnalyticsDashboard';
import MobileAnalyticsView from './mobile/MobileAnalyticsView';

// Import access control
import { 
  AnalyticsAccessProvider, 
  useAnalyticsAccess, 
  ProtectedAnalytics,
  RoleBasedFeature,
  analyticsUtils
} from './AnalyticsAccessControl';

import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';

interface DashboardOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType;
  requiredArea: any;
  mobileSupported: boolean;
}

const dashboardOptions: DashboardOption[] = [
  {
    id: 'executive',
    title: 'Executive Analytics',
    description: 'C-level operational intelligence and strategic insights',
    icon: <TrendingUp className="h-5 w-5" />,
    component: ExecutiveAnalyticsDashboard,
    requiredArea: 'executive',
    mobileSupported: false
  },
  {
    id: 'operations',
    title: 'Operations Analytics',
    description: 'Real-time performance monitoring and operational metrics',
    icon: <BarChart3 className="h-5 w-5" />,
    component: OperationsAnalyticsDashboard,
    requiredArea: 'operations',
    mobileSupported: true
  },
  {
    id: 'fleet',
    title: 'Fleet Analytics',
    description: 'Vehicle performance and geospatial fleet management',
    icon: <Truck className="h-5 w-5" />,
    component: FleetAnalyticsDashboard,
    requiredArea: 'fleet',
    mobileSupported: true
  },
  {
    id: 'financial',
    title: 'Financial Analytics',
    description: 'Revenue optimization and cost analysis',
    icon: <DollarSign className="h-5 w-5" />,
    component: FinancialAnalyticsDashboard,
    requiredArea: 'financial',
    mobileSupported: false
  },
  {
    id: 'mobile',
    title: 'Mobile Analytics',
    description: 'Field operations and mobile-optimized views',
    icon: <Smartphone className="h-5 w-5" />,
    component: () => <MobileAnalyticsView userRole={useAuth().user?.role || UserRole.DRIVER} />,
    requiredArea: 'realtime',
    mobileSupported: true
  }
];

interface AnalyticsRouterContentProps {
  isMobile?: boolean;
}

function AnalyticsRouterContent({ isMobile = false }: AnalyticsRouterContentProps) {
  const { user } = useAuth();
  const { 
    canAccessDashboard, 
    getAvailableDashboards, 
    getDefaultDashboard, 
    preferences,
    updatePreferences
  } = useAnalyticsAccess();

  const [activeDashboard, setActiveDashboard] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize active dashboard
  useEffect(() => {
    const defaultDashboard = getDefaultDashboard();
    setActiveDashboard(defaultDashboard);
    setIsLoading(false);
  }, [getDefaultDashboard]);

  // Mobile detection and auto-redirect
  useEffect(() => {
    if (isMobile && canAccessDashboard('mobile')) {
      setActiveDashboard('mobile');
    }
  }, [isMobile, canAccessDashboard]);

  // Get available dashboards
  const availableDashboards = dashboardOptions.filter(dashboard => 
    canAccessDashboard(dashboard.id)
  );

  // Handle dashboard change
  const handleDashboardChange = (dashboardId: string) => {
    setActiveDashboard(dashboardId);
    updatePreferences({ defaultDashboard: dashboardId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (availableDashboards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to access analytics dashboards.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Current role: <Badge variant="outline">{analyticsUtils.getRoleDisplayName(user?.role || UserRole.CUSTOMER)}</Badge>
            </p>
            <p className="text-sm text-gray-600">
              Please contact your administrator for access to analytics features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile view - single dashboard
  if (isMobile) {
    const activeDashboardConfig = dashboardOptions.find(d => d.id === activeDashboard);
    const Component = activeDashboardConfig?.component;

    return (
      <div className="min-h-screen">
        {Component && <Component />}
      </div>
    );
  }

  // Desktop view - tabbed interface
  const activeDashboardConfig = dashboardOptions.find(d => d.id === activeDashboard);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Analytics Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-lg text-gray-600 mt-1">
                {activeDashboardConfig?.description || 'Comprehensive business intelligence and operational insights'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Role Badge */}
              <Badge variant="outline" className="text-sm">
                {analyticsUtils.getRoleDisplayName(user?.role || UserRole.CUSTOMER)}
              </Badge>
              
              {/* System Status */}
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-600 font-medium">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeDashboard} onValueChange={handleDashboardChange}>
          <TabsList className="grid w-full grid-cols-auto mb-8">
            {availableDashboards.map((dashboard) => (
              <TabsTrigger
                key={dashboard.id}
                value={dashboard.id}
                className="flex items-center space-x-2 px-4 py-2"
              >
                {dashboard.icon}
                <span>{dashboard.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Dashboard Content */}
          {availableDashboards.map((dashboard) => (
            <TabsContent key={dashboard.id} value={dashboard.id} className="space-y-6">
              <ProtectedAnalytics
                requiredArea={dashboard.requiredArea}
                fallback={
                  <Card>
                    <CardContent className="p-8 text-center">
                      <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
                      <p className="text-gray-600">
                        You don't have permission to view this analytics dashboard.
                      </p>
                    </CardContent>
                  </Card>
                }
              >
                <dashboard.component />
              </ProtectedAnalytics>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Mobile-only message for desktop users */}
      <RoleBasedFeature roles={[UserRole.DRIVER]}>
        <div className="fixed bottom-4 right-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Mobile Optimized</p>
                  <p className="text-xs text-blue-600">Access from mobile for better field experience</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </RoleBasedFeature>
    </div>
  );
}

interface AnalyticsRouterProps {
  isMobile?: boolean;
}

export default function AnalyticsRouter({ isMobile = false }: AnalyticsRouterProps) {
  return (
    <AnalyticsAccessProvider>
      <AnalyticsRouterContent isMobile={isMobile} />
    </AnalyticsAccessProvider>
  );
}

// Export individual components for direct use
export {
  ExecutiveAnalyticsDashboard,
  OperationsAnalyticsDashboard,
  FleetAnalyticsDashboard,
  FinancialAnalyticsDashboard,
  MobileAnalyticsView,
  AnalyticsAccessProvider,
  useAnalyticsAccess,
  ProtectedAnalytics,
  RoleBasedFeature
};