'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Key,
  Shield,
  Lock,
  Unlock,
  RotateCcw,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  Eye,
  EyeOff,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Plus,
  Edit,
  Trash2,
  History,
  Activity,
  Database,
  Server,
  Zap,
  Bell,
  Users,
  FileText,
  Search
} from 'lucide-react';
import { UserRole } from '@/lib/types';

interface CryptographicKey {
  id: string;
  name: string;
  type: 'AES' | 'RSA' | 'ECDSA' | 'HMAC' | 'JWT_SECRET' | 'DATABASE_ENCRYPTION';
  purpose: string;
  keySize: number;
  algorithm: string;
  status: 'active' | 'rotating' | 'deprecated' | 'revoked';
  createdAt: string;
  expiresAt?: string;
  lastRotated?: string;
  nextRotation?: string;
  rotationInterval: number; // days
  autoRotation: boolean;
  usageCount: number;
  maxUsage?: number;
  environment: 'development' | 'staging' | 'production';
  services: string[];
  compliance: string[];
  metadata: {
    createdBy: string;
    description: string;
    tags: string[];
  };
}

interface KeyRotationSchedule {
  keyId: string;
  keyName: string;
  scheduledDate: string;
  type: 'automatic' | 'manual' | 'compliance';
  reason: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  prerequisiteChecks: string[];
  rollbackPlan: string;
  notificationList: string[];
}

interface KeyAuditEvent {
  id: string;
  keyId: string;
  keyName: string;
  action: 'created' | 'rotated' | 'accessed' | 'exported' | 'revoked' | 'updated';
  user: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  details: string;
  status: 'success' | 'failure' | 'warning';
  complianceFlags: string[];
}

interface HSMStatus {
  hsm_id: string;
  name: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  location: string;
  keyCount: number;
  utilization: number;
  temperature: number;
  lastHealthCheck: string;
  firmwareVersion: string;
  certifications: string[];
}

interface KeyManagementProps {
  userRole: UserRole;
  className?: string;
}

export default function KeyManagementInterface({ userRole, className }: KeyManagementProps) {
  const [keys, setKeys] = useState<CryptographicKey[]>([
    {
      id: 'key-001',
      name: 'Database Master Key',
      type: 'AES',
      purpose: 'Database encryption at rest',
      keySize: 256,
      algorithm: 'AES-256-GCM',
      status: 'active',
      createdAt: '2024-10-01T00:00:00Z',
      expiresAt: '2025-10-01T00:00:00Z',
      lastRotated: '2024-10-01T00:00:00Z',
      nextRotation: '2025-01-01T00:00:00Z',
      rotationInterval: 90,
      autoRotation: true,
      usageCount: 15476,
      environment: 'production',
      services: ['customer-database', 'billing-service', 'analytics-db'],
      compliance: ['GDPR', 'PCI-DSS', 'SOC2'],
      metadata: {
        createdBy: 'security.admin@company.com',
        description: 'Primary encryption key for customer and billing data',
        tags: ['critical', 'database', 'customer-data']
      }
    },
    {
      id: 'key-002',
      name: 'JWT Signing Key',
      type: 'RSA',
      purpose: 'JWT token signing and verification',
      keySize: 2048,
      algorithm: 'RSA-SHA256',
      status: 'active',
      createdAt: '2024-11-01T00:00:00Z',
      expiresAt: '2025-05-01T00:00:00Z',
      lastRotated: '2024-11-01T00:00:00Z',
      nextRotation: '2025-02-01T00:00:00Z',
      rotationInterval: 90,
      autoRotation: true,
      usageCount: 89234,
      environment: 'production',
      services: ['auth-service', 'api-gateway', 'user-portal'],
      compliance: ['GDPR', 'SOC2'],
      metadata: {
        createdBy: 'devops.team@company.com',
        description: 'Authentication token signing key for user sessions',
        tags: ['authentication', 'jwt', 'sessions']
      }
    },
    {
      id: 'key-003',
      name: 'API Encryption Key',
      type: 'AES',
      purpose: 'API payload encryption',
      keySize: 256,
      algorithm: 'AES-256-CBC',
      status: 'rotating',
      createdAt: '2024-09-15T00:00:00Z',
      expiresAt: '2025-03-15T00:00:00Z',
      lastRotated: '2024-09-15T00:00:00Z',
      nextRotation: '2024-12-15T00:00:00Z',
      rotationInterval: 90,
      autoRotation: true,
      usageCount: 45678,
      environment: 'production',
      services: ['external-api', 'webhook-service'],
      compliance: ['PCI-DSS'],
      metadata: {
        createdBy: 'api.team@company.com',
        description: 'Encryption key for sensitive API communications',
        tags: ['api', 'external', 'communication']
      }
    },
    {
      id: 'key-004',
      name: 'Legacy Payment Key',
      type: 'RSA',
      purpose: 'Legacy payment processing',
      keySize: 1024,
      algorithm: 'RSA-SHA1',
      status: 'deprecated',
      createdAt: '2023-01-01T00:00:00Z',
      expiresAt: '2024-12-31T00:00:00Z',
      lastRotated: '2023-01-01T00:00:00Z',
      rotationInterval: 365,
      autoRotation: false,
      usageCount: 234567,
      environment: 'production',
      services: ['legacy-payment-processor'],
      compliance: ['PCI-DSS'],
      metadata: {
        createdBy: 'legacy.system@company.com',
        description: 'Deprecated key for legacy payment system - scheduled for replacement',
        tags: ['legacy', 'deprecated', 'payment']
      }
    }
  ]);

  const [rotationSchedule, setRotationSchedule] = useState<KeyRotationSchedule[]>([
    {
      keyId: 'key-001',
      keyName: 'Database Master Key',
      scheduledDate: '2025-01-01T02:00:00Z',
      type: 'automatic',
      reason: 'Scheduled 90-day rotation policy',
      impact: 'medium',
      estimatedDuration: 45,
      prerequisiteChecks: ['Database backup verification', 'Service health check', 'Dependent service notification'],
      rollbackPlan: 'Revert to previous key within 5-minute window',
      notificationList: ['dba.team@company.com', 'security.team@company.com', 'ops.team@company.com']
    },
    {
      keyId: 'key-002',
      keyName: 'JWT Signing Key',
      scheduledDate: '2025-02-01T01:00:00Z',
      type: 'automatic',
      reason: 'Scheduled 90-day rotation policy',
      impact: 'high',
      estimatedDuration: 30,
      prerequisiteChecks: ['User session analysis', 'Load balancer configuration', 'Cache invalidation'],
      rollbackPlan: 'Immediate key rollback with session refresh',
      notificationList: ['auth.team@company.com', 'frontend.team@company.com']
    }
  ]);

  const [auditEvents, setAuditEvents] = useState<KeyAuditEvent[]>([
    {
      id: 'audit-001',
      keyId: 'key-003',
      keyName: 'API Encryption Key',
      action: 'rotated',
      user: 'security.admin@company.com',
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.100',
      userAgent: 'KeyManagement/1.0',
      details: 'Automatic key rotation initiated due to scheduled policy',
      status: 'success',
      complianceFlags: ['PCI-DSS-ROTATION']
    },
    {
      id: 'audit-002',
      keyId: 'key-001',
      keyName: 'Database Master Key',
      action: 'accessed',
      user: 'database.service@company.com',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      ipAddress: '10.0.0.45',
      userAgent: 'DatabaseService/2.1',
      details: 'Key accessed for customer data encryption operation',
      status: 'success',
      complianceFlags: ['GDPR-ACCESS-LOG']
    },
    {
      id: 'audit-003',
      keyId: 'key-002',
      keyName: 'JWT Signing Key',
      action: 'accessed',
      user: 'auth.service@company.com',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      ipAddress: '10.0.0.23',
      userAgent: 'AuthService/1.5',
      details: 'Key used for JWT token signature verification',
      status: 'success',
      complianceFlags: []
    }
  ]);

  const [hsmStatus, setHsmStatus] = useState<HSMStatus[]>([
    {
      hsm_id: 'hsm-primary',
      name: 'Primary HSM Cluster',
      status: 'online',
      location: 'Data Center A',
      keyCount: 47,
      utilization: 23.5,
      temperature: 42,
      lastHealthCheck: new Date(Date.now() - 300000).toISOString(),
      firmwareVersion: '7.4.2',
      certifications: ['FIPS 140-2 Level 3', 'Common Criteria EAL4+']
    },
    {
      hsm_id: 'hsm-backup',
      name: 'Backup HSM Cluster',
      status: 'online',
      location: 'Data Center B',
      keyCount: 47,
      utilization: 18.2,
      temperature: 39,
      lastHealthCheck: new Date(Date.now() - 180000).toISOString(),
      firmwareVersion: '7.4.2',
      certifications: ['FIPS 140-2 Level 3', 'Common Criteria EAL4+']
    }
  ]);

  const [selectedKey, setSelectedKey] = useState<CryptographicKey | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEnvironment, setFilterEnvironment] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user has access to key management
  const hasAccess = [UserRole.SUPER_ADMIN].includes(userRole);
  const hasRotationAccess = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRole);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'rotating': return 'bg-yellow-100 text-yellow-800';
      case 'deprecated': return 'bg-orange-100 text-orange-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rotating': return <RotateCcw className="h-4 w-4 text-yellow-600 animate-spin" />;
      case 'deprecated': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'revoked': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getHSMStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getKeyTypeIcon = (type: string) => {
    switch (type) {
      case 'AES': return <Database className="h-4 w-4 text-blue-600" />;
      case 'RSA': return <Key className="h-4 w-4 text-green-600" />;
      case 'ECDSA': return <Shield className="h-4 w-4 text-purple-600" />;
      case 'HMAC': return <Lock className="h-4 w-4 text-orange-600" />;
      default: return <Key className="h-4 w-4 text-gray-600" />;
    }
  };

  const getDaysUntilExpiry = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredKeys = keys.filter(key => {
    const statusMatch = filterStatus === 'all' || key.status === filterStatus;
    const envMatch = filterEnvironment === 'all' || key.environment === filterEnvironment;
    const searchMatch = searchTerm === '' || 
      key.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      key.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      key.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return statusMatch && envMatch && searchMatch;
  });

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">
            You don't have permission to access the Key Management Interface.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cryptographic Key Management</h2>
          <p className="text-gray-600">
            Automated key rotation management with lifecycle tracking and HSM integration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate New Cryptographic Key</DialogTitle>
                <DialogDescription>
                  Create a new cryptographic key for encryption, signing, or authentication
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Key Name</label>
                    <Input placeholder="Enter key name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Key Type</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select key type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AES">AES (Symmetric)</SelectItem>
                        <SelectItem value="RSA">RSA (Asymmetric)</SelectItem>
                        <SelectItem value="ECDSA">ECDSA (Elliptic Curve)</SelectItem>
                        <SelectItem value="HMAC">HMAC (Message Authentication)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Key Size</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select key size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="128">128 bits</SelectItem>
                        <SelectItem value="256">256 bits</SelectItem>
                        <SelectItem value="512">512 bits</SelectItem>
                        <SelectItem value="1024">1024 bits</SelectItem>
                        <SelectItem value="2048">2048 bits</SelectItem>
                        <SelectItem value="4096">4096 bits</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Environment</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select environment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Purpose</label>
                  <Textarea placeholder="Describe the intended use of this key" rows={3} />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowKeyDialog(false)}>Cancel</Button>
                  <Button onClick={() => setShowKeyDialog(false)}>Generate Key</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Key className="h-4 w-4 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Keys</p>
                <p className="text-2xl font-bold">{keys.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Keys</p>
                <p className="text-2xl font-bold">{keys.filter(k => k.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <RotateCcw className="h-4 w-4 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Scheduled Rotations</p>
                <p className="text-2xl font-bold">{rotationSchedule.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold">
                  {keys.filter(k => {
                    const days = getDaysUntilExpiry(k.expiresAt);
                    return days !== null && days <= 30;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search keys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="rotating">Rotating</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEnvironment} onValueChange={setFilterEnvironment}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="staging">Staging</SelectItem>
            <SelectItem value="development">Development</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline" className="ml-auto">
          {filteredKeys.length} keys displayed
        </Badge>
      </div>

      {/* Main Key Management Tabs */}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="keys">Cryptographic Keys</TabsTrigger>
          <TabsTrigger value="rotation">Rotation Schedule</TabsTrigger>
          <TabsTrigger value="hsm">HSM Status</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Key List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredKeys.map((key) => {
                const daysUntilExpiry = getDaysUntilExpiry(key.expiresAt);
                return (
                  <Card 
                    key={key.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedKey?.id === key.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedKey(key)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-gray-50 rounded-lg">
                            {getKeyTypeIcon(key.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{key.name}</h4>
                              <Badge className={getStatusColor(key.status)}>
                                {key.status.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {key.environment.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{key.purpose}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{key.type}-{key.keySize}</span>
                              <span>Used {key.usageCount.toLocaleString()} times</span>
                              <span>{key.services.length} services</span>
                              {daysUntilExpiry !== null && (
                                <span className={daysUntilExpiry <= 30 ? 'text-red-600 font-medium' : ''}>
                                  Expires in {daysUntilExpiry} days
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(key.status)}
                          {key.autoRotation && (
                            <Badge variant="outline" className="text-xs">
                              AUTO-ROTATE
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Key Details */}
            <div className="space-y-4">
              {selectedKey ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Key className="h-5 w-5 text-blue-600" />
                        <span>Key Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Key ID:</span>
                        <p className="text-sm text-gray-900 font-mono">{selectedKey.id}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Algorithm:</span>
                        <p className="text-sm text-gray-900">{selectedKey.algorithm}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Created:</span>
                        <p className="text-sm text-gray-900">
                          {new Date(selectedKey.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedKey.expiresAt && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Expires:</span>
                          <p className="text-sm text-gray-900">
                            {new Date(selectedKey.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-700">Rotation Interval:</span>
                        <p className="text-sm text-gray-900">{selectedKey.rotationInterval} days</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Usage Count:</span>
                        <p className="text-sm text-gray-900">{selectedKey.usageCount.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Services & Compliance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700 block mb-2">Connected Services:</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedKey.services.map((service, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 block mb-2">Compliance:</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedKey.compliance.map((compliance, index) => (
                              <Badge key={index} className="bg-green-100 text-green-800 text-xs">
                                {compliance}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 block mb-2">Tags:</span>
                          <div className="flex flex-wrap gap-1">
                            {selectedKey.metadata.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {hasRotationAccess && (
                        <Button className="w-full justify-start" variant="outline">
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Rotate Key Now
                        </Button>
                      )}
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Export Public Key
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <History className="h-4 w-4 mr-2" />
                        View History
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Settings
                      </Button>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Select a key to view details and manage settings</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rotation" className="space-y-4">
          <div className="space-y-4">
            {rotationSchedule.map((schedule) => (
              <Card key={schedule.keyId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span>{schedule.keyName}</span>
                    </CardTitle>
                    <Badge className={getImpactColor(schedule.impact)}>
                      {schedule.impact.toUpperCase()} IMPACT
                    </Badge>
                  </div>
                  <CardDescription>
                    Scheduled: {new Date(schedule.scheduledDate).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Rotation Type:</span>
                        <p className="text-sm text-gray-900 capitalize">{schedule.type}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Reason:</span>
                        <p className="text-sm text-gray-900">{schedule.reason}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Estimated Duration:</span>
                        <p className="text-sm text-gray-900">{schedule.estimatedDuration} minutes</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Rollback Plan:</span>
                        <p className="text-sm text-gray-900">{schedule.rollbackPlan}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-2">Prerequisite Checks:</span>
                        <div className="space-y-1">
                          {schedule.prerequisiteChecks.map((check, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="text-gray-700">{check}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-2">Notifications:</span>
                        <div className="space-y-1">
                          {schedule.notificationList.map((email, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <Bell className="h-3 w-3 text-blue-600" />
                              <span className="text-gray-700">{email}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      Time until rotation: {Math.ceil((new Date(schedule.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Reschedule
                      </Button>
                      <Button size="sm" variant="outline">
                        <Zap className="h-4 w-4 mr-2" />
                        Execute Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="hsm" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {hsmStatus.map((hsm) => (
              <Card key={hsm.hsm_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Server className="h-5 w-5 text-blue-600" />
                      <span>{hsm.name}</span>
                    </CardTitle>
                    <Badge className={getHSMStatusColor(hsm.status)}>
                      {hsm.status.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription>{hsm.location}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Key Count:</span>
                        <p className="text-xl font-bold text-gray-900">{hsm.keyCount}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Utilization:</span>
                        <p className="text-xl font-bold text-blue-600">{hsm.utilization}%</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Capacity Usage:</span>
                        <span className="text-sm font-medium">{hsm.utilization}%</span>
                      </div>
                      <Progress value={hsm.utilization} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Temperature:</span>
                        <p className="font-medium">{hsm.temperature}°C</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Firmware:</span>
                        <p className="font-medium">{hsm.firmwareVersion}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">Certifications:</span>
                      <div className="flex flex-wrap gap-1">
                        {hsm.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t">
                      Last health check: {new Date(hsm.lastHealthCheck).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <div className="space-y-3">
            {auditEvents.map((event) => (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">{event.keyName}</h4>
                        <Badge variant="outline" className="text-xs">
                          {event.action.toUpperCase()}
                        </Badge>
                        <Badge className={
                          event.status === 'success' ? 'bg-green-100 text-green-800' :
                          event.status === 'failure' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {event.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{event.details}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>User: {event.user}</span>
                        <span>IP: {event.ipAddress}</span>
                        <span>Time: {new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                      {event.complianceFlags.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-700">Compliance flags:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {event.complianceFlags.map((flag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Key Rotation Policies</CardTitle>
                <CardDescription>Automated key lifecycle management rules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <h4 className="font-medium text-green-800">Database Keys</h4>
                      <p className="text-xs text-green-600">Rotate every 90 days automatically</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">ACTIVE</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <h4 className="font-medium text-blue-800">JWT Signing Keys</h4>
                      <p className="text-xs text-blue-600">Rotate every 90 days with gradual rollout</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">ACTIVE</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <h4 className="font-medium text-yellow-800">API Keys</h4>
                      <p className="text-xs text-yellow-600">Rotate every 180 days with approval</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">ACTIVE</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Requirements</CardTitle>
                <CardDescription>Regulatory and security compliance policies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">PCI DSS Compliance</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Payment keys must be rotated every 12 months with dual approval
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">GDPR Requirements</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Customer data encryption keys require audit trail and retention policies
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">SOC 2 Controls</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      All key operations must be logged and monitored for unauthorized access
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}