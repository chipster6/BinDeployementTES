'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Users,
  PlayCircle,
  PauseCircle,
  Square,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  Zap,
  Target,
  Activity,
  Settings,
  Eye,
  RefreshCw,
  Filter,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Shield,
  Lock,
  Unlock,
  Bell,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SecurityIncident, IncidentTimelineEvent, ResponseAction, ThreatLevel, IncidentStatus, UserRole } from '@/lib/types';

interface IncidentPlaybook {
  id: string;
  name: string;
  description: string;
  triggerCriteria: string[];
  automatedActions: ResponseAction[];
  manualSteps: string[];
  estimatedDuration: number;
  escalationTriggers: string[];
  requiredRoles: UserRole[];
}

interface IncidentMetrics {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  escalationRate: number;
  automationRate: number;
}

interface IncidentResponseTeam {
  id: string;
  name: string;
  role: string;
  status: 'available' | 'busy' | 'offline';
  expertise: string[];
  contactMethods: {
    email: string;
    phone: string;
    slack?: string;
  };
  currentIncidents: string[];
}

interface IncidentResponseCenterProps {
  userRole: UserRole;
  className?: string;
}

export default function IncidentResponseCenter({ userRole, className }: IncidentResponseCenterProps) {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([
    {
      id: 'INC-2024-001',
      title: 'Advanced Persistent Threat Detection',
      description: 'Sophisticated malware campaign targeting route optimization algorithms detected across multiple endpoints',
      threatLevel: ThreatLevel.CRITICAL,
      incidentType: 'malware' as any,
      status: IncidentStatus.IN_PROGRESS,
      assignedTo: 'security-team-alpha',
      reportedBy: 'ai-threat-detection',
      reportedAt: new Date().toISOString(),
      timeline: [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          event: 'Incident Detected',
          description: 'AI threat detection system identified suspicious activity',
          actor: 'ThreatNet-v2.1',
          severity: ThreatLevel.HIGH
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          event: 'Incident Created',
          description: 'Security incident automatically created and assigned to response team',
          actor: 'system',
          severity: ThreatLevel.MEDIUM
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          event: 'Team Notified',
          description: 'Security team Alpha notified via emergency protocols',
          actor: 'alert-system',
          severity: ThreatLevel.MEDIUM
        }
      ],
      affectedAssets: ['route-optimization-service', 'database-server-01', 'api-gateway'],
      responseActions: [
        {
          id: 'action-1',
          action: 'Isolate Affected Systems',
          description: 'Quarantine compromised endpoints to prevent lateral movement',
          status: 'completed',
          executedBy: 'john.doe@company.com',
          executedAt: new Date(Date.now() - 900000).toISOString(),
          automated: false
        },
        {
          id: 'action-2',
          action: 'Collect Forensic Evidence',
          description: 'Capture memory dumps and network traffic for analysis',
          status: 'in_progress',
          automated: false
        },
        {
          id: 'action-3',
          action: 'Notify Executive Leadership',
          description: 'Alert C-level executives about critical security incident',
          status: 'pending',
          automated: true
        }
      ]
    },
    {
      id: 'INC-2024-002',
      title: 'Data Exfiltration Attempt',
      description: 'Unauthorized access attempt to customer database with signs of data extraction',
      threatLevel: ThreatLevel.HIGH,
      incidentType: 'data_breach' as any,
      status: IncidentStatus.OPEN,
      reportedBy: 'security.admin@company.com',
      reportedAt: new Date(Date.now() - 3600000).toISOString(),
      timeline: [
        {
          id: '1',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          event: 'Suspicious Access Detected',
          description: 'Multiple failed login attempts followed by successful breach',
          actor: 'database-monitor',
          severity: ThreatLevel.HIGH
        }
      ],
      affectedAssets: ['customer-database', 'authentication-service'],
      responseActions: [
        {
          id: 'action-1',
          action: 'Reset Database Credentials',
          description: 'Force password reset for all database accounts',
          status: 'completed',
          executedBy: 'dba.team@company.com',
          executedAt: new Date(Date.now() - 3000000).toISOString(),
          automated: false
        }
      ]
    }
  ]);

  const [playbooks, setPlaybooks] = useState<IncidentPlaybook[]>([
    {
      id: 'playbook-malware',
      name: 'Malware Response Playbook',
      description: 'Standard response procedures for malware incidents',
      triggerCriteria: ['malware_detected', 'suspicious_process', 'c2_communication'],
      automatedActions: [
        {
          id: 'auto-1',
          action: 'Isolate Endpoint',
          description: 'Automatically quarantine affected endpoint',
          status: 'pending',
          automated: true
        },
        {
          id: 'auto-2',
          action: 'Collect IOCs',
          description: 'Extract indicators of compromise for threat intel',
          status: 'pending',
          automated: true
        }
      ],
      manualSteps: [
        'Analyze malware samples in sandbox environment',
        'Check for lateral movement indicators',
        'Update threat intelligence feeds',
        'Implement additional monitoring'
      ],
      estimatedDuration: 240,
      escalationTriggers: ['critical_system_affected', 'data_exfiltration_detected'],
      requiredRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    },
    {
      id: 'playbook-data-breach',
      name: 'Data Breach Response Playbook',
      description: 'Procedures for handling data breach incidents',
      triggerCriteria: ['unauthorized_data_access', 'data_exfiltration', 'credential_compromise'],
      automatedActions: [
        {
          id: 'auto-1',
          action: 'Secure Data Sources',
          description: 'Lock down access to affected data repositories',
          status: 'pending',
          automated: true
        }
      ],
      manualSteps: [
        'Assess scope of data exposure',
        'Notify legal and compliance teams',
        'Prepare regulatory notifications',
        'Conduct forensic investigation'
      ],
      estimatedDuration: 480,
      escalationTriggers: ['customer_data_affected', 'regulatory_notification_required'],
      requiredRoles: [UserRole.SUPER_ADMIN]
    }
  ]);

  const [responseTeam, setResponseTeam] = useState<IncidentResponseTeam[]>([
    {
      id: 'team-alpha',
      name: 'Security Team Alpha',
      role: 'Primary Response Team',
      status: 'busy',
      expertise: ['malware-analysis', 'forensics', 'incident-response'],
      contactMethods: {
        email: 'security-alpha@company.com',
        phone: '+1-555-0123',
        slack: '#security-alpha'
      },
      currentIncidents: ['INC-2024-001']
    },
    {
      id: 'team-beta',
      name: 'Security Team Beta',
      role: 'Secondary Response Team',
      status: 'available',
      expertise: ['network-security', 'threat-hunting', 'compliance'],
      contactMethods: {
        email: 'security-beta@company.com',
        phone: '+1-555-0124',
        slack: '#security-beta'
      },
      currentIncidents: []
    },
    {
      id: 'forensics-team',
      name: 'Digital Forensics Team',
      role: 'Specialist Team',
      status: 'available',
      expertise: ['digital-forensics', 'malware-reverse-engineering', 'data-recovery'],
      contactMethods: {
        email: 'forensics@company.com',
        phone: '+1-555-0125'
      },
      currentIncidents: []
    }
  ]);

  const [metrics, setMetrics] = useState<IncidentMetrics>({
    totalIncidents: 47,
    activeIncidents: 2,
    resolvedIncidents: 45,
    averageResponseTime: 15,
    averageResolutionTime: 240,
    escalationRate: 12.5,
    automationRate: 68.2
  });

  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [newIncidentDialog, setNewIncidentDialog] = useState(false);

  // Check if user has access to incident response
  const hasAccess = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRole);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const getSeverityColor = (level: ThreatLevel) => {
    switch (level) {
      case ThreatLevel.CRITICAL: return 'bg-red-100 text-red-800';
      case ThreatLevel.HIGH: return 'bg-orange-100 text-orange-800';
      case ThreatLevel.MEDIUM: return 'bg-yellow-100 text-yellow-800';
      case ThreatLevel.LOW: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.OPEN: return 'bg-red-100 text-red-800';
      case IncidentStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-800';
      case IncidentStatus.RESOLVED: return 'bg-green-100 text-green-800';
      case IncidentStatus.CLOSED: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTeamStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-gray-600" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredIncidents = incidents.filter(incident => {
    const statusMatch = filterStatus === 'all' || incident.status === filterStatus;
    const severityMatch = filterSeverity === 'all' || incident.threatLevel === filterSeverity;
    return statusMatch && severityMatch;
  });

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">
            You don't have permission to access the Incident Response Center.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Response Center Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Incident Response Center</h2>
          <p className="text-gray-600">
            Security incident management and orchestrated response workflows
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
          
          <Dialog open={newIncidentDialog} onOpenChange={setNewIncidentDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Security Incident</DialogTitle>
                <DialogDescription>
                  Manually create a security incident for investigation and response
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <Input placeholder="Incident title" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Severity</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <Textarea placeholder="Detailed incident description" rows={3} />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setNewIncidentDialog(false)}>Cancel</Button>
                  <Button onClick={() => setNewIncidentDialog(false)}>Create Incident</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Response Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Incidents</p>
                <p className="text-2xl font-bold">{metrics.activeIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">{metrics.averageResponseTime}min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Target className="h-4 w-4 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold">{((metrics.resolvedIncidents / metrics.totalIncidents) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Zap className="h-4 w-4 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Automation Rate</p>
                <p className="text-2xl font-bold">{metrics.automationRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline" className="ml-auto">
          {filteredIncidents.length} incidents displayed
        </Badge>
      </div>

      {/* Main Response Console */}
      <Tabs defaultValue="incidents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="incidents">Active Incidents</TabsTrigger>
          <TabsTrigger value="playbooks">Response Playbooks</TabsTrigger>
          <TabsTrigger value="team">Response Teams</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Incident List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredIncidents.map((incident) => (
                <Card 
                  key={incident.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedIncident?.id === incident.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedIncident(incident)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{incident.title}</h4>
                          <Badge className={getSeverityColor(incident.threatLevel)}>
                            {incident.threatLevel.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusColor(incident.status)}>
                            {incident.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>ID: {incident.id}</span>
                          <span>Reported: {new Date(incident.reportedAt).toLocaleString()}</span>
                          <span>Assets: {incident.affectedAssets.length}</span>
                          <span>Actions: {incident.responseActions.length}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {incident.status === IncidentStatus.IN_PROGRESS && (
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Incident Details */}
            <div className="space-y-4">
              {selectedIncident ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span>Incident Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Incident ID:</span>
                        <p className="text-sm text-gray-900">{selectedIncident.id}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Reported By:</span>
                        <p className="text-sm text-gray-900">{selectedIncident.reportedBy}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Assigned To:</span>
                        <p className="text-sm text-gray-900">{selectedIncident.assignedTo || 'Unassigned'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Affected Assets:</span>
                        <div className="mt-1 space-y-1">
                          {selectedIncident.affectedAssets.map((asset, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {asset}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span>Response Actions</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedIncident.responseActions.map((action) => (
                          <div key={action.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            {getActionStatusIcon(action.status)}
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-gray-900">{action.action}</h4>
                              <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge className={
                                  action.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  action.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {action.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                                {action.automated && (
                                  <Badge variant="outline" className="text-xs">
                                    AUTO
                                  </Badge>
                                )}
                              </div>
                              {action.executedBy && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Executed by: {action.executedBy}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <span>Timeline</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedIncident.timeline.map((event) => (
                          <div key={event.id} className="border-l-2 border-gray-200 pl-4">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-sm text-gray-900">{event.event}</h4>
                              <Badge className={getSeverityColor(event.severity)}>
                                {event.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">{event.description}</p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>{event.actor}</span>
                              <span>•</span>
                              <span>{new Date(event.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Select an incident to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="playbooks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {playbooks.map((playbook) => (
              <Card key={playbook.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>{playbook.name}</span>
                  </CardTitle>
                  <CardDescription>{playbook.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">Trigger Criteria:</span>
                      <div className="flex flex-wrap gap-1">
                        {playbook.triggerCriteria.map((criteria, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {criteria.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">Automated Actions:</span>
                      <div className="space-y-1">
                        {playbook.automatedActions.map((action, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <Zap className="h-3 w-3 text-yellow-600" />
                            <span className="text-gray-700">{action.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">Manual Steps:</span>
                      <div className="space-y-1">
                        {playbook.manualSteps.slice(0, 3).map((step, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <Users className="h-3 w-3 text-blue-600" />
                            <span className="text-gray-700">{step}</span>
                          </div>
                        ))}
                        {playbook.manualSteps.length > 3 && (
                          <p className="text-xs text-gray-500 ml-5">
                            +{playbook.manualSteps.length - 3} more steps
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm">
                        <span className="text-gray-600">Est. Duration:</span>
                        <span className="font-medium ml-1">{playbook.estimatedDuration}min</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Execute
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {responseTeam.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span>{team.name}</span>
                  </CardTitle>
                  <CardDescription>{team.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <Badge className={getTeamStatusColor(team.status)}>
                        {team.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">Expertise:</span>
                      <div className="flex flex-wrap gap-1">
                        {team.expertise.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill.replace('-', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-gray-700 block mb-2">Contact:</span>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-700">{team.contactMethods.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-700">{team.contactMethods.phone}</span>
                        </div>
                        {team.contactMethods.slack && (
                          <div className="flex items-center space-x-2">
                            <MessageSquare className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-700">{team.contactMethods.slack}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm">
                        <span className="text-gray-600">Active Incidents:</span>
                        <span className="font-medium ml-1">{team.currentIncidents.length}</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <Bell className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Automation Metrics</CardTitle>
                <CardDescription>Response automation performance and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Automation Rate</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={metrics.automationRate} className="w-24" />
                      <span className="text-sm font-bold">{metrics.automationRate}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Average Response Time</span>
                    <span className="text-sm font-bold">{metrics.averageResponseTime} minutes</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Automated Actions Today</span>
                    <span className="text-sm font-bold">127</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Manual Interventions</span>
                    <span className="text-sm font-bold">23</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automation Rules</CardTitle>
                <CardDescription>Configure automated response triggers and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <h4 className="font-medium text-green-800">Malware Isolation</h4>
                      <p className="text-xs text-green-600">Auto-quarantine infected endpoints</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">ACTIVE</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <h4 className="font-medium text-blue-800">Credential Reset</h4>
                      <p className="text-xs text-blue-600">Force password reset on breach</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">ACTIVE</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <h4 className="font-medium text-yellow-800">Executive Notification</h4>
                      <p className="text-xs text-yellow-600">Alert leadership on critical incidents</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">ACTIVE</Badge>
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