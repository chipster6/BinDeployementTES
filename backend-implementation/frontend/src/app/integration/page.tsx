'use client';

import React from 'react';
import { IntegrationDashboard } from '@/components/integration/IntegrationDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function IntegrationPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Integration Test Center</h1>
              <p className="text-muted-foreground">
                Test and monitor frontend-backend connectivity
              </p>
            </div>
          </div>
          <Badge variant={isAuthenticated ? 'default' : 'secondary'}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </Badge>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common integration testing tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  {isAuthenticated ? 'Switch User' : 'Login'}
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  Dashboard
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
              <Link href="/performance-demo">
                <Button variant="outline" className="w-full">
                  Performance Demo
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
              <Link href="/soc">
                <Button variant="outline" className="w-full">
                  SOC Dashboard
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* User Context */}
        {isAuthenticated && user && (
          <Card>
            <CardHeader>
              <CardTitle>Current User Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Name</p>
                  <p>{user.name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Email</p>
                  <p>{user.email}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Role</p>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Organization</p>
                  <p>{user.organizationId || 'None'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Integration Dashboard */}
        <IntegrationDashboard />

        {/* Environment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Configuration</CardTitle>
            <CardDescription>
              Current environment settings for debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">API Configuration</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL}</p>
                  <p><strong>WebSocket URL:</strong> {process.env.NEXT_PUBLIC_WEBSOCKET_URL}</p>
                  <p><strong>Environment:</strong> {process.env.NEXT_PUBLIC_APP_ENVIRONMENT}</p>
                  <p><strong>Timeout:</strong> {process.env.NEXT_PUBLIC_API_TIMEOUT}ms</p>
                  <p><strong>Retry Attempts:</strong> {process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Feature Flags</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p><strong>AI/ML Features:</strong> {process.env.NEXT_PUBLIC_ENABLE_AI_ML_FEATURES}</p>
                  <p><strong>Route Optimization:</strong> {process.env.NEXT_PUBLIC_ENABLE_ROUTE_OPTIMIZATION}</p>
                  <p><strong>Security Dashboard:</strong> {process.env.NEXT_PUBLIC_ENABLE_SECURITY_DASHBOARD}</p>
                  <p><strong>Real-time Updates:</strong> {process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES}</p>
                  <p><strong>Performance Monitoring:</strong> {process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Documentation</CardTitle>
            <CardDescription>
              Key integration components and their status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Frontend Components</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ Enhanced API Client with auto-retry</li>
                  <li>✅ JWT Authentication with refresh</li>
                  <li>✅ WebSocket real-time connections</li>
                  <li>✅ TypeScript type safety</li>
                  <li>✅ Error boundary handling</li>
                  <li>✅ Performance monitoring</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Backend Integration</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ Comprehensive API endpoints</li>
                  <li>✅ Authentication & authorization</li>
                  <li>✅ Real-time WebSocket channels</li>
                  <li>✅ Health check endpoints</li>
                  <li>✅ External service coordination</li>
                  <li>✅ AI/ML service integration</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Integration Features</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Badge variant="outline">Authentication Flow</Badge>
                <Badge variant="outline">Real-time Updates</Badge>
                <Badge variant="outline">API Endpoint Mapping</Badge>
                <Badge variant="outline">Error Handling</Badge>
                <Badge variant="outline">Network Resilience</Badge>
                <Badge variant="outline">Type Safety</Badge>
                <Badge variant="outline">Performance Monitoring</Badge>
                <Badge variant="outline">Health Checking</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}