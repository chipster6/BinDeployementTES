'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
  Database, 
  Play, 
  Square, 
  RotateCcw, 
  Download, 
  Upload, 
  RefreshCw, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  Timer,
  TrendingUp,
  Shield,
  Archive
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { 
  Migration, 
  MigrationPlan, 
  MigrationExecution, 
  DatabaseBackup, 
  MigrationStatus,
  MigrationLog 
} from '@/lib/types';

interface CreateMigrationPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<MigrationPlan, 'id' | 'created_at'>) => void;
}

function CreateMigrationPlanDialog({ isOpen, onClose, onSubmit }: CreateMigrationPlanDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_version: '',
    migrations: [] as Migration[],
    estimated_duration: 0,
    risk_level: 'low' as 'low' | 'medium' | 'high',
    requires_downtime: false,
    backup_required: true,
    rollback_plan: '',
    created_by: '',
    approved_by: '',
    approved_at: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: '',
      description: '',
      target_version: '',
      migrations: [],
      estimated_duration: 0,
      risk_level: 'low',
      requires_downtime: false,
      backup_required: true,
      rollback_plan: '',
      created_by: '',
      approved_by: '',
      approved_at: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Migration Plan</DialogTitle>
          <DialogDescription>
            Create a new database migration plan with rollback strategy
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Plan Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Migration plan name"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this migration does"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_version">Target Version</Label>
              <Input
                id="target_version"
                value={formData.target_version}
                onChange={(e) => setFormData({ ...formData, target_version: e.target.value })}
                placeholder="1.2.0"
                required
              />
            </div>
            <div>
              <Label htmlFor="estimated_duration">Duration (minutes)</Label>
              <Input
                id="estimated_duration"
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="risk_level">Risk Level</Label>
            <select
              id="risk_level"
              value={formData.risk_level}
              onChange={(e) => setFormData({ ...formData, risk_level: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full p-2 border rounded-md"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <Label htmlFor="rollback_plan">Rollback Plan</Label>
            <Textarea
              id="rollback_plan"
              value={formData.rollback_plan}
              onChange={(e) => setFormData({ ...formData, rollback_plan: e.target.value })}
              placeholder="Describe how to rollback this migration"
              required
            />
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.requires_downtime}
                onChange={(e) => setFormData({ ...formData, requires_downtime: e.target.checked })}
              />
              <span className="text-sm">Requires Downtime</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.backup_required}
                onChange={(e) => setFormData({ ...formData, backup_required: e.target.checked })}
              />
              <span className="text-sm">Backup Required</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Plan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MigrationExecutionDetailsProps {
  execution: MigrationExecution;
  onClose: () => void;
  onRollback: () => void;
}

function MigrationExecutionDetails({ execution, onClose, onRollback }: MigrationExecutionDetailsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'running': return 'text-blue-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-yellow-600';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Migration Execution Details</DialogTitle>
          <DialogDescription>
            Execution ID: {execution.id}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Status</span>
                <Badge className={getStatusColor(execution.status)}>
                  {execution.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Progress</span>
                <span>{execution.progress}%</span>
              </div>
              <Progress value={execution.progress} className="h-2" />
              {execution.current_migration && (
                <div className="flex justify-between">
                  <span>Current Migration</span>
                  <span className="font-mono text-sm">{execution.current_migration}</span>
                </div>
              )}
              {execution.started_at && (
                <div className="flex justify-between">
                  <span>Started</span>
                  <span>{new Date(execution.started_at).toLocaleString()}</span>
                </div>
              )}
              {execution.completed_at && (
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span>{new Date(execution.completed_at).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Message */}
          {execution.error_message && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{execution.error_message}</AlertDescription>
            </Alert>
          )}

          {/* Execution Logs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-sm">
                {execution.logs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-xs ${getLogLevelColor(log.level)}`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.level.toUpperCase()}
                      </Badge>
                      {log.migration_name && (
                        <span className="text-blue-600">{log.migration_name}</span>
                      )}
                    </div>
                    <div className="mt-1">{log.message}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {execution.can_rollback && (
            <Button variant="destructive" onClick={onRollback}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Rollback
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MigrationsTabProps {
  migrations: Migration[];
  onRefresh: () => void;
}

function MigrationsTab({ migrations, onRefresh }: MigrationsTabProps) {
  const getStatusIcon = (status: MigrationStatus) => {
    switch (status) {
      case MigrationStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case MigrationStatus.FAILED:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case MigrationStatus.RUNNING:
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case MigrationStatus.ROLLED_BACK:
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Database Migrations</h3>
          <p className="text-sm text-gray-600">View and manage database schema migrations</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Executed</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Rollback</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {migrations.map((migration) => (
              <TableRow key={migration.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{migration.name}</div>
                    <div className="text-sm text-gray-600 truncate max-w-xs">
                      {migration.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{migration.version}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(migration.status)}
                    <span className="capitalize">{migration.status.replace('_', ' ')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {migration.executed_at ? (
                    <span className="text-sm">
                      {new Date(migration.executed_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {migration.execution_time ? (
                    <span className="text-sm">{migration.execution_time}ms</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={migration.rollback_available ? "default" : "outline"}>
                    {migration.rollback_available ? "Available" : "Not Available"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

interface PlansTabProps {
  plans: MigrationPlan[];
  onRefresh: () => void;
  onCreatePlan: (plan: Omit<MigrationPlan, 'id' | 'created_at'>) => void;
  onExecutePlan: (planId: string) => void;
}

function PlansTab({ plans, onRefresh, onCreatePlan, onExecutePlan }: PlansTabProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Migration Plans</h3>
          <p className="text-sm text-gray-600">Create and execute database migration plans</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <Badge className={getRiskColor(plan.risk_level)}>
                  {plan.risk_level.toUpperCase()}
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Target Version</span>
                  <Badge variant="outline">{plan.target_version}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span>{plan.estimated_duration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Migrations</span>
                  <span>{plan.migrations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Downtime</span>
                  <Badge variant={plan.requires_downtime ? "destructive" : "outline"}>
                    {plan.requires_downtime ? "Required" : "None"}
                  </Badge>
                </div>
                {plan.approved_by && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Approved</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onExecutePlan(plan.id)}
                  disabled={!plan.approved_by}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Execute
                </Button>
                <Button size="sm" variant="outline">
                  <FileText className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateMigrationPlanDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={onCreatePlan}
      />
    </div>
  );
}

interface ExecutionsTabProps {
  executions: MigrationExecution[];
  onRefresh: () => void;
  onViewExecution: (execution: MigrationExecution) => void;
  onRollbackExecution: (executionId: string) => void;
}

function ExecutionsTab({ executions, onRefresh, onViewExecution, onRollbackExecution }: ExecutionsTabProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'cancelled': return <Square className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Migration Executions</h3>
          <p className="text-sm text-gray-600">Monitor migration execution progress and history</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.map((execution) => (
              <TableRow key={execution.id}>
                <TableCell className="font-mono text-sm">{execution.plan_id}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(execution.status)}
                    <span className="capitalize">{execution.status.replace('_', ' ')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{execution.progress}%</span>
                    </div>
                    <Progress value={execution.progress} className="h-1" />
                  </div>
                </TableCell>
                <TableCell>
                  {execution.started_at ? (
                    <span className="text-sm">
                      {new Date(execution.started_at).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {execution.started_at && execution.completed_at ? (
                    <span className="text-sm">
                      {Math.round((new Date(execution.completed_at).getTime() - 
                                  new Date(execution.started_at).getTime()) / 1000 / 60)} min
                    </span>
                  ) : execution.started_at ? (
                    <span className="text-sm text-blue-600">Running...</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onViewExecution(execution)}
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                    {execution.can_rollback && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onRollbackExecution(execution.id)}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
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

interface BackupsTabProps {
  backups: DatabaseBackup[];
  onRefresh: () => void;
  onCreateBackup: (name: string, type: 'full' | 'incremental' | 'differential') => void;
  onDownloadBackup: (backupId: string) => void;
}

function BackupsTab({ backups, onRefresh, onCreateBackup, onDownloadBackup }: BackupsTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [backupType, setBackupType] = useState<'full' | 'incremental' | 'differential'>('full');

  const handleCreateBackup = async () => {
    if (!backupName) return;
    
    setIsCreating(true);
    try {
      await onCreateBackup(backupName, backupType);
      setBackupName('');
      setBackupType('full');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'creating': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Database Backups</h3>
          <p className="text-sm text-gray-600">Create and manage database backups</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Create Backup Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Create New Backup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 items-end">
            <div className="flex-1">
              <Label htmlFor="backup-name">Backup Name</Label>
              <Input
                id="backup-name"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="production-backup-20231215"
              />
            </div>
            <div>
              <Label htmlFor="backup-type">Type</Label>
              <select
                id="backup-type"
                value={backupType}
                onChange={(e) => setBackupType(e.target.value as 'full' | 'incremental' | 'differential')}
                className="w-full p-2 border rounded-md"
              >
                <option value="full">Full</option>
                <option value="incremental">Incremental</option>
                <option value="differential">Differential</option>
              </select>
            </div>
            <Button 
              onClick={handleCreateBackup} 
              disabled={!backupName || isCreating}
            >
              {isCreating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.map((backup) => (
              <TableRow key={backup.id}>
                <TableCell className="font-medium">{backup.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {backup.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatSize(backup.size)}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(backup.status)}>
                    {backup.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(backup.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm">
                  {backup.expires_at ? (
                    new Date(backup.expires_at).toLocaleDateString()
                  ) : (
                    <span className="text-gray-400">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  {backup.status === 'completed' && backup.download_url && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onDownloadBackup(backup.id)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export function MigrationDashboard() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [plans, setPlans] = useState<MigrationPlan[]>([]);
  const [executions, setExecutions] = useState<MigrationExecution[]>([]);
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<MigrationExecution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [migrationsResponse, plansResponse, backupsResponse] = await Promise.all([
        apiClient.getMigrations(),
        apiClient.getMigrationPlans(),
        apiClient.getDatabaseBackups()
      ]);

      if (migrationsResponse.success && migrationsResponse.data) {
        setMigrations(migrationsResponse.data);
      }
      if (plansResponse.success && plansResponse.data) {
        setPlans(plansResponse.data);
      }
      if (backupsResponse.success && backupsResponse.data) {
        setBackups(backupsResponse.data);
      }
    } catch (err) {
      setError('Failed to load migration data');
      console.error('Error loading migration data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async (planData: Omit<MigrationPlan, 'id' | 'created_at'>) => {
    try {
      await apiClient.createMigrationPlan(planData);
      loadAllData();
    } catch (err) {
      console.error('Error creating migration plan:', err);
    }
  };

  const handleExecutePlan = async (planId: string) => {
    try {
      const response = await apiClient.executeMigrationPlan(planId);
      if (response.success && response.data) {
        setExecutions(prev => [response.data!, ...prev]);
      }
    } catch (err) {
      console.error('Error executing migration plan:', err);
    }
  };

  const handleRollbackExecution = async (executionId: string) => {
    try {
      await apiClient.rollbackMigrationExecution(executionId);
      loadAllData();
    } catch (err) {
      console.error('Error rolling back migration:', err);
    }
  };

  const handleCreateBackup = async (name: string, type: 'full' | 'incremental' | 'differential') => {
    try {
      await apiClient.createDatabaseBackup(name, type);
      loadAllData();
    } catch (err) {
      console.error('Error creating backup:', err);
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      const response = await apiClient.downloadDatabaseBackup(backupId);
      if (response.success && response.data?.download_url) {
        window.open(response.data.download_url, '_blank');
      }
    } catch (err) {
      console.error('Error downloading backup:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading migration data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Database Migrations</h1>
          <p className="text-gray-600">Manage database schema migrations and backups</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{migrations.length}</div>
              <div className="text-gray-600">Migrations</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{plans.length}</div>
              <div className="text-gray-600">Plans</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{executions.length}</div>
              <div className="text-gray-600">Executions</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600">{backups.length}</div>
              <div className="text-gray-600">Backups</div>
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
      <Tabs defaultValue="migrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="migrations">Migrations</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
        </TabsList>

        <TabsContent value="migrations">
          <MigrationsTab migrations={migrations} onRefresh={loadAllData} />
        </TabsContent>

        <TabsContent value="plans">
          <PlansTab
            plans={plans}
            onRefresh={loadAllData}
            onCreatePlan={handleCreatePlan}
            onExecutePlan={handleExecutePlan}
          />
        </TabsContent>

        <TabsContent value="executions">
          <ExecutionsTab
            executions={executions}
            onRefresh={loadAllData}
            onViewExecution={setSelectedExecution}
            onRollbackExecution={handleRollbackExecution}
          />
        </TabsContent>

        <TabsContent value="backups">
          <BackupsTab
            backups={backups}
            onRefresh={loadAllData}
            onCreateBackup={handleCreateBackup}
            onDownloadBackup={handleDownloadBackup}
          />
        </TabsContent>
      </Tabs>

      {/* Execution Details Modal */}
      {selectedExecution && (
        <MigrationExecutionDetails
          execution={selectedExecution}
          onClose={() => setSelectedExecution(null)}
          onRollback={() => {
            handleRollbackExecution(selectedExecution.id);
            setSelectedExecution(null);
          }}
        />
      )}
    </div>
  );
}