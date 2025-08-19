'use client';

import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Brain, 
  RefreshCw, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  BarChart3, 
  Zap, 
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Gauge,
  Activity,
  Cpu,
  Database,
  Code,
  FileText,
  Download
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useCachedAPI } from '@/hooks/useCachedAPI';
import useOptimizedWebSocket from '@/hooks/useOptimizedWebSocket';
import VirtualizedTable, { VirtualizedTableColumn } from '@/components/ui/virtualized-table';
import { 
  FeatureFlag, 
  ABTest, 
  MLModelMetrics, 
  MLModelDeployment, 
  AIPipelineRun,
  UserRole 
} from '@/lib/types';

interface CreateFeatureFlagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>) => void;
}

function CreateFeatureFlagDialog({ isOpen, onClose, onSubmit }: CreateFeatureFlagDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: false,
    environment: 'development' as 'development' | 'staging' | 'production',
    rollout_percentage: 0,
    target_users: [] as string[],
    target_roles: [] as UserRole[],
    conditions: [],
    created_by: 'current_user'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: '',
      description: '',
      enabled: false,
      environment: 'development',
      rollout_percentage: 0,
      target_users: [],
      target_roles: [],
      conditions: [],
      created_by: 'current_user'
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Feature Flag</DialogTitle>
          <DialogDescription>
            Create a new feature flag for controlled rollouts
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="new-feature-flag"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this feature flag controls"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="environment">Environment</Label>
              <select
                id="environment"
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value as 'development' | 'staging' | 'production' })}
                className="w-full p-2 border rounded-md"
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <Label htmlFor="rollout_percentage">Rollout %</Label>
              <Input
                id="rollout_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.rollout_percentage}
                onChange={(e) => setFormData({ ...formData, rollout_percentage: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
            <Label htmlFor="enabled">Enable immediately</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Flag</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FeatureFlagsTabProps {
  flags: FeatureFlag[];
  onRefresh: () => void;
  onCreateFlag: (flag: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>) => void;
  onToggleFlag: (id: string) => void;
}

const FeatureFlagsTab = memo<FeatureFlagsTabProps>(({ flags, onRefresh, onCreateFlag, onToggleFlag }) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const getEnvironmentColor = useCallback((env: string) => {
    switch (env) {
      case 'production': return 'bg-red-100 text-red-800';
      case 'staging': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  }, []);

  const flagColumns = useMemo<VirtualizedTableColumn<FeatureFlag>[]>(() => [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      width: 200,
      render: (value, flag) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-600 truncate">{flag.description}</div>
        </div>
      )
    },
    {
      id: 'environment',
      header: 'Environment',
      accessor: 'environment',
      width: 120,
      render: (value) => (
        <Badge className={getEnvironmentColor(value)}>
          {value.toUpperCase()}
        </Badge>
      )
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'enabled',
      width: 100,
      render: (value) => (
        <Badge variant={value ? "default" : "outline"}>
          {value ? "Enabled" : "Disabled"}
        </Badge>
      )
    },
    {
      id: 'rollout',
      header: 'Rollout',
      accessor: 'rollout_percentage',
      width: 120,
      sortable: true,
      render: (value) => (
        <div className="space-y-1">
          <div className="text-sm">{value}%</div>
          <Progress value={value} className="h-1" />
        </div>
      )
    },
    {
      id: 'created',
      header: 'Created',
      accessor: 'created_at',
      width: 120,
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: 'id',
      width: 120,
      render: (value, flag) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant={flag.enabled ? "outline" : "default"}
            onClick={() => onToggleFlag(value)}
          >
            {flag.enabled ? "Disable" : "Enable"}
          </Button>
        </div>
      )
    }
  ], [getEnvironmentColor, onToggleFlag]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Feature Flags</h3>
          <p className="text-sm text-gray-600">Control feature rollouts and A/B testing</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Flag
          </Button>
        </div>
      </div>

      <VirtualizedTable
        data={flags}
        columns={flagColumns}
        height={500}
        rowHeight={80}
        searchable={true}
        filterable={true}
        sortable={true}
        emptyMessage="No feature flags found"
      />

      <CreateFeatureFlagDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={onCreateFlag}
      />
    </div>
  );
});

FeatureFlagsTab.displayName = 'FeatureFlagsTab';

interface ABTestsTabProps {
  tests: ABTest[];
  onRefresh: () => void;
  onStartTest: (id: string) => void;
  onStopTest: (id: string) => void;
}

function ABTestsTab({ tests, onRefresh, onStartTest, onStopTest }: ABTestsTabProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4 text-green-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">A/B Tests</h3>
          <p className="text-sm text-gray-600">Monitor A/B test performance and results</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tests.map((test) => (
          <Card key={test.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{test.name}</CardTitle>
                <Badge className={getStatusColor(test.status)}>
                  {getStatusIcon(test.status)}
                  <span className="ml-1 capitalize">{test.status}</span>
                </Badge>
              </div>
              <CardDescription>{test.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Sample Size</span>
                    <span>{test.current_sample_size}/{test.target_sample_size}</span>
                  </div>
                  <Progress 
                    value={(test.current_sample_size / test.target_sample_size) * 100} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Conversion Goal</span>
                    <span className="truncate">{test.conversion_goal}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Variants</h4>
                {test.variants.map((variant, index) => (
                  <div key={variant.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm font-medium">{variant.name}</span>
                      <span className="text-xs text-gray-600 ml-2">{variant.percentage}%</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{variant.participants} participants</div>
                      <div className="text-xs text-gray-600">
                        {variant.conversions} conversions ({((variant.conversions / variant.participants) * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {test.results && (
                <div className="p-3 bg-blue-50 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-700">Results</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    {test.results.winner && (
                      <div className="flex justify-between">
                        <span>Winner</span>
                        <span className="font-medium">{test.results.winner}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span>{test.results.confidence_level.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Significant</span>
                      <Badge variant={test.results.statistical_significance ? "default" : "outline"}>
                        {test.results.statistical_significance ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Started</span>
                  <span>{new Date(test.start_date).toLocaleDateString()}</span>
                </div>
                {test.end_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ended</span>
                    <span>{new Date(test.end_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Created by</span>
                  <span>{test.created_by}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                {test.status === 'running' ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onStopTest(test.id)}
                    className="flex-1"
                  >
                    <Square className="h-3 w-3 mr-2" />
                    Stop Test
                  </Button>
                ) : test.status === 'draft' ? (
                  <Button 
                    size="sm"
                    onClick={() => onStartTest(test.id)}
                    className="flex-1"
                  >
                    <Play className="h-3 w-3 mr-2" />
                    Start Test
                  </Button>
                ) : null}
                <Button size="sm" variant="outline">
                  <BarChart3 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface MLModelsTabProps {
  models: MLModelMetrics[];
  deployments: MLModelDeployment[];
  onRefresh: () => void;
  onDeployModel: (deployment: Omit<MLModelDeployment, 'id' | 'deployed_at' | 'status'>) => void;
}

function MLModelsTab({ models, deployments, onRefresh, onDeployModel }: MLModelsTabProps) {
  const getModelHealthColor = (accuracy: number) => {
    if (accuracy >= 0.9) return 'text-green-600';
    if (accuracy >= 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDeploymentStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'deploying': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">ML Models</h3>
          <p className="text-sm text-gray-600">Monitor model performance and deployments</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Model Metrics */}
      <div>
        <h4 className="text-base font-medium mb-3">Model Performance</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <Card key={model.model_name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{model.model_name}</CardTitle>
                  <Badge variant="outline">v{model.version}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Accuracy</span>
                    <div className={`text-lg font-semibold ${getModelHealthColor(model.accuracy)}`}>
                      {(model.accuracy * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Precision</span>
                    <div className="text-lg font-semibold">
                      {(model.precision * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Recall</span>
                    <div className="text-lg font-semibold">
                      {(model.recall * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">F1 Score</span>
                    <div className="text-lg font-semibold">
                      {(model.f1_score * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latency (P99)</span>
                    <span className="font-mono">{model.latency_p99}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Throughput</span>
                    <span className="font-mono">{model.throughput}/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Error Rate</span>
                    <span className="font-mono">{(model.error_rate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Predictions (24h)</span>
                    <span className="font-mono">{model.prediction_count_24h.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Data Drift</span>
                    <Badge variant={model.data_drift_score > 0.1 ? "destructive" : "outline"}>
                      {model.data_drift_score.toFixed(3)}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Trained</span>
                    <span>{new Date(model.last_trained).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <BarChart3 className="h-3 w-3 mr-2" />
                    Details
                  </Button>
                  <Button size="sm" variant="outline">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Deployments */}
      <div>
        <h4 className="text-base font-medium mb-3">Model Deployments</h4>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Replicas</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Deployed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{deployment.model_name}</div>
                      <div className="text-sm text-gray-600">v{deployment.version}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {deployment.environment}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getDeploymentStatusColor(deployment.status)}>
                      {deployment.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{deployment.replicas}</TableCell>
                  <TableCell className="font-mono text-sm">
                    <div>{deployment.resource_allocation.cpu}</div>
                    <div>{deployment.resource_allocation.memory}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(deployment.deployed_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3" />
                      </Button>
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
    </div>
  );
}

interface PipelinesTabProps {
  pipelines: AIPipelineRun[];
  onRefresh: () => void;
  onTriggerPipeline: (pipelineName: string, params?: Record<string, any>) => void;
}

function PipelinesTab({ pipelines, onRefresh, onTriggerPipeline }: PipelinesTabProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'cancelled': return <Square className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">AI/ML Pipelines</h3>
          <p className="text-sm text-gray-600">Monitor pipeline runs and trigger new executions</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => onTriggerPipeline('route-optimization')} size="sm">
            <Play className="h-4 w-4 mr-2" />
            Trigger Pipeline
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pipeline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Triggered By</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pipelines.map((pipeline) => (
              <TableRow key={pipeline.id}>
                <TableCell>
                  <div className="font-medium">{pipeline.pipeline_name}</div>
                  <div className="text-sm text-gray-600 capitalize">{pipeline.trigger_type}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(pipeline.status)}
                    <span className="capitalize">{pipeline.status}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {pipeline.duration ? (
                    <span className="font-mono">{Math.round(pipeline.duration / 1000)}s</span>
                  ) : pipeline.status === 'running' ? (
                    <span className="text-blue-600">Running...</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>{pipeline.triggered_by}</TableCell>
                <TableCell className="text-sm">
                  {new Date(pipeline.started_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {pipeline.steps.filter(s => s.status === 'completed').length}/{pipeline.steps.length}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline">
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3" />
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

export const AIMLDashboard = memo(() => {
  // Use cached API hooks for optimized data fetching
  const {
    data: featureFlags = [],
    isLoading: flagsLoading,
    error: flagsError,
    refresh: refreshFlags
  } = useCachedAPI<FeatureFlag[]>('/api/aiml/feature-flags', undefined, {
    ttl: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  const {
    data: abTests = [],
    isLoading: testsLoading,
    error: testsError,
    refresh: refreshTests
  } = useCachedAPI<ABTest[]>('/api/aiml/ab-tests', undefined, {
    ttl: 60 * 1000, // 1 minute
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  const {
    data: mlModels = [],
    isLoading: modelsLoading,
    error: modelsError,
    refresh: refreshModels
  } = useCachedAPI<MLModelMetrics[]>('/api/aiml/models', undefined, {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  const {
    data: deployments = [],
    isLoading: deploymentsLoading,
    error: deploymentsError,
    refresh: refreshDeployments
  } = useCachedAPI<MLModelDeployment[]>('/api/aiml/deployments', undefined, {
    ttl: 3 * 60 * 1000, // 3 minutes
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  const {
    data: pipelines = [],
    isLoading: pipelinesLoading,
    error: pipelinesError,
    refresh: refreshPipelines
  } = useCachedAPI<AIPipelineRun[]>('/api/aiml/pipelines', undefined, {
    ttl: 30 * 1000, // 30 seconds
    staleWhileRevalidate: true,
    backgroundRefresh: true
  });

  // WebSocket for real-time AI/ML updates
  const {
    isConnected: wsConnected,
    sendMessage
  } = useOptimizedWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL?.replace('performance', 'aiml') || 'ws://localhost:8080/aiml',
    batchSize: 5,
    batchTimeout: 300,
    onBatchMessage: useCallback((messages) => {
      messages.forEach(message => {
        switch (message.type) {
          case 'feature_flag_updated':
            refreshFlags();
            break;
          case 'ab_test_updated':
            refreshTests();
            break;
          case 'model_updated':
            refreshModels();
            break;
          case 'deployment_updated':
            refreshDeployments();
            break;
          case 'pipeline_updated':
            refreshPipelines();
            break;
        }
      });
    }, [refreshFlags, refreshTests, refreshModels, refreshDeployments, refreshPipelines])
  });

  // Memoized computed values
  const { isLoading, error, enabledFlags, runningTests, activeModels } = useMemo(() => {
    const isLoading = flagsLoading || testsLoading || modelsLoading || deploymentsLoading || pipelinesLoading;
    const error = flagsError || testsError || modelsError || deploymentsError || pipelinesError;
    const enabledFlags = featureFlags.filter(f => f.enabled).length;
    const runningTests = abTests.filter(t => t.status === 'running').length;
    const activeModels = deployments.filter(d => d.status === 'active').length;

    return { isLoading, error, enabledFlags, runningTests, activeModels };
  }, [
    flagsLoading, testsLoading, modelsLoading, deploymentsLoading, pipelinesLoading,
    flagsError, testsError, modelsError, deploymentsError, pipelinesError,
    featureFlags, abTests, deployments
  ]);

  // Optimized refresh function
  const loadAllData = useCallback(async () => {
    refreshFlags();
    refreshTests();
    refreshModels();
    refreshDeployments();
    refreshPipelines();
  }, [refreshFlags, refreshTests, refreshModels, refreshDeployments, refreshPipelines]);

  const handleCreateFeatureFlag = useCallback(async (flagData: Omit<FeatureFlag, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await apiClient.createFeatureFlag(flagData);
      refreshFlags();
    } catch (err) {
      console.error('Error creating feature flag:', err);
    }
  }, [refreshFlags]);

  const handleToggleFlag = useCallback(async (id: string) => {
    try {
      await apiClient.toggleFeatureFlag(id);
      refreshFlags();
    } catch (err) {
      console.error('Error toggling feature flag:', err);
    }
  }, [refreshFlags]);

  const handleStartABTest = useCallback(async (id: string) => {
    try {
      await apiClient.startABTest(id);
      refreshTests();
    } catch (err) {
      console.error('Error starting A/B test:', err);
    }
  }, [refreshTests]);

  const handleStopABTest = useCallback(async (id: string) => {
    try {
      await apiClient.stopABTest(id);
      refreshTests();
    } catch (err) {
      console.error('Error stopping A/B test:', err);
    }
  }, [refreshTests]);

  const handleDeployModel = useCallback(async (deployment: Omit<MLModelDeployment, 'id' | 'deployed_at' | 'status'>) => {
    try {
      await apiClient.deployMLModel(deployment);
      refreshDeployments();
    } catch (err) {
      console.error('Error deploying model:', err);
    }
  }, [refreshDeployments]);

  const handleTriggerPipeline = useCallback(async (pipelineName: string, params?: Record<string, any>) => {
    try {
      await apiClient.triggerAIPipeline(pipelineName, params);
      refreshPipelines();
    } catch (err) {
      console.error('Error triggering pipeline:', err);
    }
  }, [refreshPipelines]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading AI/ML data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI/ML Management</h1>
          <p className="text-gray-600">Feature flags, A/B testing, and machine learning operations</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-2">
            <Badge variant={wsConnected ? 'default' : 'destructive'}>
              {wsConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button variant="outline" onClick={loadAllData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{enabledFlags}</div>
              <div className="text-gray-600">Active Flags</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{runningTests}</div>
              <div className="text-gray-600">Running Tests</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{activeModels}</div>
              <div className="text-gray-600">Active Models</div>
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
      <Tabs defaultValue="flags" className="space-y-6">
        <TabsList>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="tests">A/B Tests</TabsTrigger>
          <TabsTrigger value="models">ML Models</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
        </TabsList>

        <TabsContent value="flags">
          <FeatureFlagsTab
            flags={featureFlags}
            onRefresh={loadAllData}
            onCreateFlag={handleCreateFeatureFlag}
            onToggleFlag={handleToggleFlag}
          />
        </TabsContent>

        <TabsContent value="tests">
          <ABTestsTab
            tests={abTests}
            onRefresh={loadAllData}
            onStartTest={handleStartABTest}
            onStopTest={handleStopABTest}
          />
        </TabsContent>

        <TabsContent value="models">
          <MLModelsTab
            models={mlModels}
            deployments={deployments}
            onRefresh={loadAllData}
            onDeployModel={handleDeployModel}
          />
        </TabsContent>

        <TabsContent value="pipelines">
          <PipelinesTab
            pipelines={pipelines}
            onRefresh={loadAllData}
            onTriggerPipeline={handleTriggerPipeline}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
});

AIMLDashboard.displayName = 'AIMLDashboard';