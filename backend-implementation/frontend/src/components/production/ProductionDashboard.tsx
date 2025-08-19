'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Server, 
  RefreshCw, 
  Play, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Activity,
  Gauge,
  Database,
  Shield,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Zap,
  Settings,
  Download,
  Upload,
  Globe,
  Users,
  ArrowUp,
  ArrowDown,
  Pause
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { 
  InfrastructureStatus, 
  DeploymentStatus, 
  ServiceStatus as ServiceStatusType,
  DatabaseStatus,
  CacheStatus,
  SSLCertificateStatus,
  BackupStatus 
} from '@/lib/types';

interface InfrastructureOverviewProps {
  infrastructure: InfrastructureStatus;
  onRefresh: () => void;
  onRestartService: (serviceName: string, environment: string) => void;
  onScaleService: (serviceName: string, environment: string, replicas: number) => void;
}

function InfrastructureOverview({ 
  infrastructure, 
  onRefresh, 
  onRestartService, 
  onScaleService 
}: InfrastructureOverviewProps) {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'stopped': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'restarting': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Infrastructure Status</h3>
          <p className="text-sm text-gray-600">{infrastructure.environment} Environment</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className={getHealthColor(infrastructure.overall_health)}>
            {infrastructure.overall_health.toUpperCase()}
          </Badge>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Services Overview */}
      <div>
        <h4 className="text-base font-medium mb-3">Services</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {infrastructure.services.map((service) => (
            <Card key={service.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {getServiceStatusIcon(service.status)}
                    <span className="text-sm capitalize">{service.status}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Replicas</span>
                    <div className="font-semibold">
                      {service.replicas.ready}/{service.replicas.desired}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Uptime</span>
                    <div className="font-semibold">{formatUptime(service.uptime)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>CPU</span>
                      <span>{service.resource_usage.cpu.toFixed(1)}%</span>
                    </div>
                    <Progress value={service.resource_usage.cpu} className="h-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Memory</span>
                      <span>{service.resource_usage.memory.toFixed(1)}%</span>
                    </div>
                    <Progress value={service.resource_usage.memory} className="h-1" />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onRestartService(service.name, infrastructure.environment)}
                    className="flex-1"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Restart
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onScaleService(service.name, infrastructure.environment, service.replicas.desired + 1)}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onScaleService(service.name, infrastructure.environment, Math.max(1, service.replicas.desired - 1))}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Databases */}
      <div>
        <h4 className="text-base font-medium mb-3">Databases</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {infrastructure.databases.map((db) => (
            <Card key={db.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4" />
                    <CardTitle className="text-base">{db.name}</CardTitle>
                  </div>
                  <Badge variant={db.status === 'online' ? 'default' : 'destructive'}>
                    {db.status.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="capitalize">{db.type}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Connections</span>
                    <div className="font-semibold">{db.connections.active}/{db.connections.max}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">QPS</span>
                    <div className="font-semibold">{db.performance.queries_per_second}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Response</span>
                    <div className="font-semibold">{db.performance.average_response_time}ms</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Slow Queries</span>
                    <div className="font-semibold">{db.performance.slow_queries}</div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Storage</span>
                    <span>{db.storage.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={db.storage.percentage} className="h-2" />
                  <div className="flex justify-between text-xs mt-1 text-gray-600">
                    <span>{(db.storage.used / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                    <span>{(db.storage.total / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                  </div>
                </div>

                {db.replication && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Replication</span>
                    <Badge variant={db.replication.status === 'healthy' ? 'default' : 'destructive'}>
                      {db.replication.status}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* SSL Certificates */}
      <div>
        <h4 className="text-base font-medium mb-3">SSL Certificates</h4>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Issuer</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auto Renewal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {infrastructure.ssl_certificates.map((cert) => (
                <TableRow key={cert.domain}>
                  <TableCell className="font-medium">{cert.domain}</TableCell>
                  <TableCell>{cert.issuer}</TableCell>
                  <TableCell>{new Date(cert.valid_until).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={cert.days_until_expiry <= 30 ? 'text-red-600 font-medium' : ''}>
                      {cert.days_until_expiry}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cert.status === 'valid' ? 'default' : 'destructive'}>
                      {cert.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cert.auto_renewal ? 'default' : 'outline'}>
                      {cert.auto_renewal ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Backup Status */}
      <div>
        <h4 className="text-base font-medium mb-3">Backup Status</h4>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {infrastructure.backup_status.available_backups}
                </div>
                <div className="text-sm text-gray-600">Available Backups</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium">
                  {new Date(infrastructure.backup_status.last_backup).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">Last Backup</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium">
                  {new Date(infrastructure.backup_status.next_backup).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">Next Backup</div>
              </div>
              <div className="text-center">
                <Badge variant={infrastructure.backup_status.status === 'successful' ? 'default' : 'destructive'}>
                  {infrastructure.backup_status.status.toUpperCase()}
                </Badge>
                <div className="text-sm text-gray-600 mt-1">Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface DeploymentsTabProps {
  deployments: DeploymentStatus[];
  onRefresh: () => void;
  onCreateDeployment: (deployment: {
    environment: 'staging' | 'production';
    version: string;
    strategy: 'blue_green' | 'rolling' | 'canary' | 'recreate';
  }) => void;
  onRollbackDeployment: (id: string) => void;
}

function DeploymentsTab({ 
  deployments, 
  onRefresh, 
  onCreateDeployment, 
  onRollbackDeployment 
}: DeploymentsTabProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'deploying': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'rolling_back': return <RotateCcw className="h-4 w-4 text-orange-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'deploying': return 'bg-blue-100 text-blue-800';
      case 'rolling_back': return 'bg-orange-100 text-orange-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Deployments</h3>
          <p className="text-sm text-gray-600">Manage application deployments and rollbacks</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => onCreateDeployment({
              environment: 'staging',
              version: 'latest',
              strategy: 'rolling'
            })} 
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            New Deployment
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Deployed By</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell className="font-mono">{deployment.version}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {deployment.environment}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(deployment.status)}
                    <Badge className={getStatusColor(deployment.status)}>
                      {deployment.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="capitalize">
                  {deployment.deployment_strategy.replace('_', ' ')}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{deployment.progress}%</span>
                    </div>
                    <Progress value={deployment.progress} className="h-2" />
                  </div>
                </TableCell>
                <TableCell>{deployment.deployed_by}</TableCell>
                <TableCell className="text-sm">
                  {new Date(deployment.started_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    {deployment.rollback_available && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onRollbackDeployment(deployment.id)}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Activity className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function ProductionDashboard() {
  const [infrastructure, setInfrastructure] = useState<InfrastructureStatus | null>(null);
  const [deployments, setDeployments] = useState<DeploymentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [infraResponse, deploymentsResponse] = await Promise.all([
        apiClient.getInfrastructureStatus('production'),
        apiClient.getDeployments()
      ]);

      if (infraResponse.success && infraResponse.data) {
        setInfrastructure(infraResponse.data);
      }
      if (deploymentsResponse.success && deploymentsResponse.data) {
        setDeployments(deploymentsResponse.data);
      }
    } catch (err) {
      setError('Failed to load production data');
      console.error('Error loading production data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartService = async (serviceName: string, environment: string) => {
    try {
      await apiClient.restartService(serviceName, environment);
      loadAllData();
    } catch (err) {
      console.error('Error restarting service:', err);
    }
  };

  const handleScaleService = async (serviceName: string, environment: string, replicas: number) => {
    try {
      await apiClient.scaleService(serviceName, environment, replicas);
      loadAllData();
    } catch (err) {
      console.error('Error scaling service:', err);
    }
  };

  const handleCreateDeployment = async (deployment: {
    environment: 'staging' | 'production';
    version: string;
    strategy: 'blue_green' | 'rolling' | 'canary' | 'recreate';
  }) => {
    try {
      await apiClient.createDeployment(deployment);
      loadAllData();
    } catch (err) {
      console.error('Error creating deployment:', err);
    }
  };

  const handleRollbackDeployment = async (id: string) => {
    try {
      await apiClient.rollbackDeployment(id);
      loadAllData();
    } catch (err) {
      console.error('Error rolling back deployment:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading production data...</span>
        </div>
      </div>
    );
  }

  const runningServices = infrastructure?.services.filter(s => s.status === 'running').length || 0;
  const totalServices = infrastructure?.services.length || 0;
  const onlineDatabases = infrastructure?.databases.filter(d => d.status === 'online').length || 0;
  const totalDatabases = infrastructure?.databases.length || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production Operations</h1>
          <p className="text-gray-600">Monitor and manage production infrastructure and deployments</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{runningServices}/{totalServices}</div>
              <div className="text-gray-600">Services</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{onlineDatabases}/{totalDatabases}</div>
              <div className="text-gray-600">Databases</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{deployments.length}</div>
              <div className="text-gray-600">Deployments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="infrastructure" className="space-y-6">
        <TabsList>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
        </TabsList>

        <TabsContent value="infrastructure">
          {infrastructure && (
            <InfrastructureOverview
              infrastructure={infrastructure}
              onRefresh={loadAllData}
              onRestartService={handleRestartService}
              onScaleService={handleScaleService}
            />
          )}
        </TabsContent>

        <TabsContent value="deployments">
          <DeploymentsTab
            deployments={deployments}
            onRefresh={loadAllData}
            onCreateDeployment={handleCreateDeployment}
            onRollbackDeployment={handleRollbackDeployment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}