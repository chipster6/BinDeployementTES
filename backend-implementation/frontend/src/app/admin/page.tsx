'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Lock, 
  Database, 
  Gauge, 
  Shield, 
  Cpu, 
  Settings,
  Server,
  Activity,
  Key,
  RefreshCw
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MonitoringDashboard } from '@/components/monitoring/MonitoringDashboard';
import { SecretsManagementDashboard } from '@/components/secrets/SecretsManagementDashboard';
import { MigrationDashboard } from '@/components/migrations/MigrationDashboard';
import { ExternalServicesDashboard } from '@/components/external/ExternalServicesDashboard';
import { AIMLDashboard } from '@/components/aiml/AIMLDashboard';
import { ProductionDashboard } from '@/components/production/ProductionDashboard';
import { UserRole } from '@/lib/types';

interface DashboardOverviewProps {
  onNavigateToTab: (tab: string) => void;
}

function DashboardOverview({ onNavigateToTab }: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Production Operations Dashboard</h2>
        <p className="text-gray-600">
          Comprehensive management interface for monitoring, security, and infrastructure operations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Monitoring Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onNavigateToTab('monitoring')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Monitor className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">System Monitoring</CardTitle>
              </div>
              <Badge className="bg-green-100 text-green-800">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Real-time system health, performance metrics, and alert management
            </CardDescription>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Prometheus Metrics</span>
                <span className="text-green-600 font-medium">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Grafana Dashboards</span>
                <span className="text-green-600 font-medium">Available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Alert Rules</span>
                <span className="text-blue-600 font-medium">15 Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secrets Management Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onNavigateToTab('secrets')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg">Secrets Management</CardTitle>
              </div>
              <Badge className="bg-purple-100 text-purple-800">
                <Shield className="h-3 w-3 mr-1" />
                Secure
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Manage Docker Secrets and HashiCorp Vault with automated rotation
            </CardDescription>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Vault Secrets</span>
                <span className="text-purple-600 font-medium">24 Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Docker Secrets</span>
                <span className="text-purple-600 font-medium">8 Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Auto Rotation</span>
                <span className="text-green-600 font-medium">Enabled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Migrations Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onNavigateToTab('migrations')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Database Migrations</CardTitle>
              </div>
              <Badge className="bg-green-100 text-green-800">
                <RefreshCw className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Schema migration management with rollback capabilities and automated backups
            </CardDescription>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Migrations</span>
                <span className="text-orange-600 font-medium">3 Available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Migration Plans</span>
                <span className="text-green-600 font-medium">5 Ready</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Backups</span>
                <span className="text-blue-600 font-medium">12 Available</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* External Services Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onNavigateToTab('external')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg">External Services</CardTitle>
              </div>
              <Badge className="bg-orange-100 text-orange-800">
                <Gauge className="h-3 w-3 mr-1" />
                Monitoring
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              External API health monitoring, cost optimization, and fallback management
            </CardDescription>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Stripe</span>
                <span className="text-green-600 font-medium">Operational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Twilio</span>
                <span className="text-green-600 font-medium">Operational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cost Savings</span>
                <span className="text-blue-600 font-medium">23% This Month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI/ML Features Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onNavigateToTab('aiml')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">AI/ML Management</CardTitle>
              </div>
              <Badge className="bg-indigo-100 text-indigo-800">
                <Activity className="h-3 w-3 mr-1" />
                Beta
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Feature flags, A/B testing, ML model deployments, and pipeline management
            </CardDescription>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Feature Flags</span>
                <span className="text-indigo-600 font-medium">12 Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">A/B Tests</span>
                <span className="text-green-600 font-medium">3 Running</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ML Models</span>
                <span className="text-blue-600 font-medium">4 Deployed</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production Operations Card */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onNavigateToTab('production')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg">Production Ops</CardTitle>
              </div>
              <Badge className="bg-gray-100 text-gray-800">
                <Server className="h-3 w-3 mr-1" />
                Stable
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Deployment management, service scaling, infrastructure health monitoring
            </CardDescription>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Services Running</span>
                <span className="text-green-600 font-medium">12/12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Deployment</span>
                <span className="text-gray-600 font-medium">2h ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Health Score</span>
                <span className="text-green-600 font-medium">98%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks and emergency procedures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Shield className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <div className="text-sm font-medium">Emergency Stop</div>
              <div className="text-xs text-gray-600">Stop all services</div>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-sm font-medium">Restart Services</div>
              <div className="text-xs text-gray-600">Rolling restart</div>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Database className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-sm font-medium">Create Backup</div>
              <div className="text-xs text-gray-600">Full database backup</div>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Key className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-sm font-medium">Rotate Secrets</div>
              <div className="text-xs text-gray-600">Force rotation</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Administration Dashboard</h1>
            <p className="text-gray-600">
              Production operations and infrastructure management
            </p>
          </div>
          <Badge className="bg-red-100 text-red-800 px-3 py-1">
            <Shield className="h-4 w-4 mr-1" />
            Admin Access Required
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="secrets">Secrets</TabsTrigger>
            <TabsTrigger value="migrations">Migrations</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
            <TabsTrigger value="aiml">AI/ML</TabsTrigger>
            <TabsTrigger value="production">Production</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DashboardOverview onNavigateToTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <MonitoringDashboard />
          </TabsContent>

          <TabsContent value="secrets" className="space-y-6">
            <SecretsManagementDashboard />
          </TabsContent>

          <TabsContent value="migrations" className="space-y-6">
            <MigrationDashboard />
          </TabsContent>

          <TabsContent value="external" className="space-y-6">
            <ExternalServicesDashboard />
          </TabsContent>

          <TabsContent value="aiml" className="space-y-6">
            <AIMLDashboard />
          </TabsContent>

          <TabsContent value="production" className="space-y-6">
            <ProductionDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
      <AdminDashboard />
    </ProtectedRoute>
  );
}