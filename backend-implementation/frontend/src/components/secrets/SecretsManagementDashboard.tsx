'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
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
  Key, 
  Lock, 
  Shield, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Server
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { 
  VaultSecret, 
  DockerSecret, 
  SecretRotationConfig, 
  SecretAccessLog 
} from '@/lib/types';

interface CreateSecretDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; path: string; value: string; description?: string }) => void;
  isVault?: boolean;
}

function CreateSecretDialog({ isOpen, onClose, onSubmit, isVault = true }: CreateSecretDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    value: '',
    description: ''
  });
  const [showValue, setShowValue] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', path: '', value: '', description: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create {isVault ? 'Vault' : 'Docker'} Secret</DialogTitle>
          <DialogDescription>
            Add a new secret to {isVault ? 'HashiCorp Vault' : 'Docker Secrets'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="secret-name"
              required
            />
          </div>
          {isVault && (
            <div>
              <Label htmlFor="path">Vault Path</Label>
              <Input
                id="path"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="secret/myapp/database"
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="value">Value</Label>
            <div className="relative">
              <Input
                id="value"
                type={showValue ? "text" : "password"}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Enter secret value"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowValue(!showValue)}
              >
                {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description of this secret"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Secret</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface VaultSecretsTabProps {
  secrets: VaultSecret[];
  onRefresh: () => void;
  onCreateSecret: (data: any) => void;
  onDeleteSecret: (path: string) => void;
}

function VaultSecretsTab({ secrets, onRefresh, onCreateSecret, onDeleteSecret }: VaultSecretsTabProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const getEngineIcon = (engine: string) => {
    switch (engine) {
      case 'database': return <Database className="h-4 w-4" />;
      case 'pki': return <Shield className="h-4 w-4" />;
      case 'transit': return <Key className="h-4 w-4" />;
      default: return <Lock className="h-4 w-4" />;
    }
  };

  const getExpiryStatus = (expiresAt?: string) => {
    if (!expiresAt) return { status: 'no-expiry', color: 'bg-gray-500', text: 'No Expiry' };
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: 'bg-red-500', text: 'Expired' };
    if (daysUntilExpiry <= 7) return { status: 'expiring-soon', color: 'bg-yellow-500', text: `${daysUntilExpiry}d` };
    if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'bg-orange-500', text: `${daysUntilExpiry}d` };
    return { status: 'valid', color: 'bg-green-500', text: `${daysUntilExpiry}d` };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">HashiCorp Vault Secrets</h3>
          <p className="text-sm text-gray-600">Manage secrets stored in Vault</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Secret
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Engine</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Rotation</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secrets.map((secret) => {
              const expiryStatus = getExpiryStatus(secret.metadata.expires_at);
              return (
                <TableRow key={secret.path}>
                  <TableCell className="font-mono text-sm">{secret.path}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getEngineIcon(secret.engine)}
                      <span className="capitalize">{secret.engine}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">v{secret.metadata.version}</Badge>
                  </TableCell>
                  <TableCell>
                    {secret.metadata.rotation_enabled ? (
                      <Badge className="bg-green-100 text-green-800">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${expiryStatus.color}`} />
                      <span className="text-sm">{expiryStatus.text}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(secret.metadata.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onDeleteSecret(secret.path)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <CreateSecretDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={onCreateSecret}
        isVault={true}
      />
    </div>
  );
}

interface DockerSecretsTabProps {
  secrets: DockerSecret[];
  onRefresh: () => void;
  onCreateSecret: (data: any) => void;
  onDeleteSecret: (id: string) => void;
}

function DockerSecretsTab({ secrets, onRefresh, onCreateSecret, onDeleteSecret }: DockerSecretsTabProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Docker Secrets</h3>
          <p className="text-sm text-gray-600">Manage Docker Swarm secrets</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Secret
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {secrets.map((secret) => (
              <TableRow key={secret.id}>
                <TableCell className="font-medium">{secret.name}</TableCell>
                <TableCell className="font-mono text-sm">{secret.id.substring(0, 12)}...</TableCell>
                <TableCell>
                  <Badge variant="outline">{secret.version.index}</Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {new Date(secret.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {new Date(secret.updated_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onDeleteSecret(secret.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <CreateSecretDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={onCreateSecret}
        isVault={false}
      />
    </div>
  );
}

interface RotationTabProps {
  configs: SecretRotationConfig[];
  onRefresh: () => void;
  onUpdateConfig: (secretName: string, config: Partial<SecretRotationConfig>) => void;
  onRotateSecret: (secretName: string) => void;
}

function RotationTab({ configs, onRefresh, onUpdateConfig, onRotateSecret }: RotationTabProps) {
  const getRotationStatus = (config: SecretRotationConfig) => {
    if (!config.auto_rotation) return { color: 'bg-gray-500', text: 'Disabled' };
    
    if (config.next_rotation) {
      const nextRotation = new Date(config.next_rotation);
      const now = new Date();
      const hoursUntilRotation = Math.ceil((nextRotation.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      if (hoursUntilRotation <= 0) return { color: 'bg-red-500', text: 'Overdue' };
      if (hoursUntilRotation <= 24) return { color: 'bg-yellow-500', text: `${hoursUntilRotation}h` };
      if (hoursUntilRotation <= 168) return { color: 'bg-orange-500', text: `${Math.ceil(hoursUntilRotation / 24)}d` };
    }
    
    return { color: 'bg-green-500', text: 'Active' };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Secret Rotation</h3>
          <p className="text-sm text-gray-600">Manage automatic secret rotation policies</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map((config) => {
          const status = getRotationStatus(config);
          return (
            <Card key={config.secret_name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{config.secret_name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className={`h-2 w-2 rounded-full ${status.color}`} />
                    <span className="text-sm">{status.text}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interval</span>
                    <span>{config.rotation_interval}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auto Rotation</span>
                    <Badge variant={config.auto_rotation ? "default" : "outline"}>
                      {config.auto_rotation ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  {config.last_rotation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Rotation</span>
                      <span>{new Date(config.last_rotation).toLocaleDateString()}</span>
                    </div>
                  )}
                  {config.next_rotation && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Rotation</span>
                      <span>{new Date(config.next_rotation).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => onRotateSecret(config.secret_name)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Rotate Now
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onUpdateConfig(config.secret_name, {
                      auto_rotation: !config.auto_rotation
                    })}
                  >
                    {config.auto_rotation ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface AuditTabProps {
  logs: SecretAccessLog[];
  onRefresh: () => void;
}

function AuditTab({ logs, onRefresh }: AuditTabProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'read': return <Eye className="h-4 w-4 text-blue-500" />;
      case 'write': return <Edit className="h-4 w-4 text-green-500" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'rotate': return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default: return <Key className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Access Audit Log</h3>
          <p className="text-sm text-gray-600">Track all secret access and modifications</p>
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
              <TableHead>Timestamp</TableHead>
              <TableHead>Secret</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">
                  {new Date(log.timestamp).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-sm">{log.secret_name}</TableCell>
                <TableCell>{log.user_email}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getActionIcon(log.action)}
                    <span className="capitalize">{log.action}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                <TableCell>
                  {log.success ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Success
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
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

export function SecretsManagementDashboard() {
  const [vaultSecrets, setVaultSecrets] = useState<VaultSecret[]>([]);
  const [dockerSecrets, setDockerSecrets] = useState<DockerSecret[]>([]);
  const [rotationConfigs, setRotationConfigs] = useState<SecretRotationConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecretAccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [vaultResponse, dockerResponse, rotationResponse, auditResponse] = await Promise.all([
        apiClient.getVaultSecrets(),
        apiClient.getDockerSecrets(),
        apiClient.getSecretRotationConfigs(),
        apiClient.getSecretAccessLogs()
      ]);

      if (vaultResponse.success && vaultResponse.data) {
        setVaultSecrets(vaultResponse.data);
      }
      if (dockerResponse.success && dockerResponse.data) {
        setDockerSecrets(dockerResponse.data);
      }
      if (rotationResponse.success && rotationResponse.data) {
        setRotationConfigs(rotationResponse.data);
      }
      if (auditResponse.success && auditResponse.data) {
        setAuditLogs(auditResponse.data);
      }
    } catch (err) {
      setError('Failed to load secrets data');
      console.error('Error loading secrets data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVaultSecret = async (data: any) => {
    try {
      await apiClient.createVaultSecret(data.path, { value: data.value, description: data.description });
      loadAllData();
    } catch (err) {
      console.error('Error creating vault secret:', err);
    }
  };

  const handleCreateDockerSecret = async (data: any) => {
    try {
      await apiClient.createDockerSecret(data.name, data.value);
      loadAllData();
    } catch (err) {
      console.error('Error creating docker secret:', err);
    }
  };

  const handleDeleteVaultSecret = async (path: string) => {
    try {
      await apiClient.deleteVaultSecret(path);
      loadAllData();
    } catch (err) {
      console.error('Error deleting vault secret:', err);
    }
  };

  const handleDeleteDockerSecret = async (id: string) => {
    try {
      await apiClient.deleteDockerSecret(id);
      loadAllData();
    } catch (err) {
      console.error('Error deleting docker secret:', err);
    }
  };

  const handleUpdateRotationConfig = async (secretName: string, config: Partial<SecretRotationConfig>) => {
    try {
      await apiClient.updateSecretRotationConfig(secretName, config);
      loadAllData();
    } catch (err) {
      console.error('Error updating rotation config:', err);
    }
  };

  const handleRotateSecret = async (secretName: string) => {
    try {
      await apiClient.rotateSecret(secretName);
      loadAllData();
    } catch (err) {
      console.error('Error rotating secret:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading secrets data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Secrets Management</h1>
          <p className="text-gray-600">Manage Docker Secrets and HashiCorp Vault secrets</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{vaultSecrets.length}</div>
              <div className="text-gray-600">Vault Secrets</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{dockerSecrets.length}</div>
              <div className="text-gray-600">Docker Secrets</div>
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
      <Tabs defaultValue="vault" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vault">Vault Secrets</TabsTrigger>
          <TabsTrigger value="docker">Docker Secrets</TabsTrigger>
          <TabsTrigger value="rotation">Rotation Policies</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="vault">
          <VaultSecretsTab
            secrets={vaultSecrets}
            onRefresh={loadAllData}
            onCreateSecret={handleCreateVaultSecret}
            onDeleteSecret={handleDeleteVaultSecret}
          />
        </TabsContent>

        <TabsContent value="docker">
          <DockerSecretsTab
            secrets={dockerSecrets}
            onRefresh={loadAllData}
            onCreateSecret={handleCreateDockerSecret}
            onDeleteSecret={handleDeleteDockerSecret}
          />
        </TabsContent>

        <TabsContent value="rotation">
          <RotationTab
            configs={rotationConfigs}
            onRefresh={loadAllData}
            onUpdateConfig={handleUpdateRotationConfig}
            onRotateSecret={handleRotateSecret}
          />
        </TabsContent>

        <TabsContent value="audit">
          <AuditTab
            logs={auditLogs}
            onRefresh={loadAllData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}