'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  FileText,
  Download,
  Eye,
  Calendar,
  Users,
  Lock,
  Unlock,
  Target,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  Search,
  AlertCircle,
  Info,
  Settings,
  BookOpen,
  Award,
  Zap
} from 'lucide-react';
import { ComplianceStatus, ComplianceIssue, ThreatLevel, UserRole } from '@/lib/types';

interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  score: number;
  status: 'compliant' | 'non_compliant' | 'partial' | 'unknown';
  lastAudit: string;
  nextAudit: string;
  auditor: string;
  certificateExpiry?: string;
  requirements: ComplianceRequirement[];
  issues: ComplianceIssue[];
  improvements: ComplianceImprovement[];
}

interface ComplianceRequirement {
  id: string;
  control: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'partial';
  evidence: string[];
  lastReviewed: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ComplianceImprovement {
  id: string;
  title: string;
  description: string;
  impact: number;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  status: 'planned' | 'in_progress' | 'completed';
  assignedTo: string;
}

interface AuditTrail {
  id: string;
  timestamp: string;
  framework: string;
  action: string;
  user: string;
  details: string;
  result: 'success' | 'failure' | 'warning';
}

interface ComplianceDashboardProps {
  userRole: UserRole;
  className?: string;
}

export default function SecurityComplianceDashboard({ userRole, className }: ComplianceDashboardProps) {
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([
    {
      id: 'gdpr',
      name: 'GDPR',
      description: 'General Data Protection Regulation',
      score: 95.8,
      status: 'compliant',
      lastAudit: '2024-09-15',
      nextAudit: '2025-09-15',
      auditor: 'EuroCompliance Ltd.',
      certificateExpiry: '2025-09-30',
      requirements: [
        {
          id: 'gdpr-01',
          control: 'Data Processing Lawfulness',
          description: 'Ensure all data processing has lawful basis',
          status: 'compliant',
          evidence: ['privacy-policy.pdf', 'consent-records.json'],
          lastReviewed: '2024-11-01',
          assignedTo: 'Legal Team',
          priority: 'high'
        },
        {
          id: 'gdpr-02',
          control: 'Data Subject Rights',
          description: 'Implement mechanisms for data subject rights',
          status: 'compliant',
          evidence: ['rights-portal.md', 'deletion-procedures.pdf'],
          lastReviewed: '2024-10-15',
          assignedTo: 'Privacy Officer',
          priority: 'high'
        }
      ],
      issues: [],
      improvements: [
        {
          id: 'gdpr-imp-01',
          title: 'Automated Data Mapping',
          description: 'Implement automated data flow mapping for better compliance tracking',
          impact: 15,
          effort: 'medium',
          timeline: '3 months',
          status: 'planned',
          assignedTo: 'Data Protection Team'
        }
      ]
    },
    {
      id: 'pci-dss',
      name: 'PCI DSS',
      description: 'Payment Card Industry Data Security Standard',
      score: 91.2,
      status: 'compliant',
      lastAudit: '2024-08-20',
      nextAudit: '2025-08-20',
      auditor: 'Trustwave',
      requirements: [
        {
          id: 'pci-01',
          control: 'Firewall Configuration',
          description: 'Install and maintain firewall configuration',
          status: 'compliant',
          evidence: ['firewall-config.json', 'penetration-test.pdf'],
          lastReviewed: '2024-11-10',
          assignedTo: 'Network Security',
          priority: 'critical'
        },
        {
          id: 'pci-02',
          control: 'Default Passwords',
          description: 'Do not use vendor-supplied defaults for passwords',
          status: 'partial',
          evidence: ['password-policy.pdf'],
          lastReviewed: '2024-10-28',
          assignedTo: 'System Admin',
          priority: 'high'
        }
      ],
      issues: [
        {
          id: 'pci-issue-01',
          control: 'PCI-02',
          description: 'Some legacy systems still using default passwords',
          severity: ThreatLevel.MEDIUM,
          status: 'in_progress',
          dueDate: '2024-12-31'
        }
      ],
      improvements: []
    },
    {
      id: 'soc2',
      name: 'SOC 2 Type II',
      description: 'Service Organization Control 2',
      score: 89.6,
      status: 'compliant',
      lastAudit: '2024-06-30',
      nextAudit: '2025-06-30',
      auditor: 'Deloitte',
      requirements: [
        {
          id: 'soc2-01',
          control: 'Access Controls',
          description: 'Logical and physical access controls',
          status: 'compliant',
          evidence: ['access-matrix.xlsx', 'badge-logs.csv'],
          lastReviewed: '2024-11-05',
          assignedTo: 'Security Team',
          priority: 'high'
        }
      ],
      issues: [
        {
          id: 'soc2-issue-01',
          control: 'SOC2-Security-2.1',
          description: 'Incomplete documentation of incident response procedures',
          severity: ThreatLevel.LOW,
          status: 'open',
          dueDate: '2025-01-15'
        }
      ],
      improvements: []
    },
    {
      id: 'iso27001',
      name: 'ISO 27001',
      description: 'Information Security Management',
      score: 93.1,
      status: 'compliant',
      lastAudit: '2024-07-15',
      nextAudit: '2025-07-15',
      auditor: 'BSI Group',
      certificateExpiry: '2025-07-30',
      requirements: [
        {
          id: 'iso-01',
          control: 'A.5.1.1',
          description: 'Information security policies',
          status: 'compliant',
          evidence: ['infosec-policy.pdf', 'policy-approval.pdf'],
          lastReviewed: '2024-10-20',
          assignedTo: 'CISO',
          priority: 'high'
        }
      ],
      issues: [],
      improvements: []
    }
  ]);

  const [auditTrail, setAuditTrail] = useState<AuditTrail[]>([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      framework: 'GDPR',
      action: 'Control Assessment Completed',
      user: 'jane.doe@company.com',
      details: 'Data Processing Lawfulness control reviewed and marked compliant',
      result: 'success'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      framework: 'PCI DSS',
      action: 'Issue Identified',
      user: 'security.admin@company.com',
      details: 'Default passwords found on legacy payment processing system',
      result: 'warning'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      framework: 'SOC 2',
      action: 'Evidence Uploaded',
      user: 'compliance.team@company.com',
      details: 'Access control matrix updated with Q4 2024 data',
      result: 'success'
    }
  ]);

  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has access to compliance dashboard
  const hasAccess = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRole);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'non_compliant': return 'bg-red-100 text-red-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unknown': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'non_compliant': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'unknown': return <Info className="h-4 w-4 text-gray-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const overallComplianceScore = Math.round(
    frameworks.reduce((sum, framework) => sum + framework.score, 0) / frameworks.length
  );

  const totalIssues = frameworks.reduce((sum, framework) => sum + framework.issues.length, 0);
  const criticalIssues = frameworks.reduce((sum, framework) => 
    sum + framework.issues.filter(issue => issue.severity === ThreatLevel.CRITICAL).length, 0
  );

  const upcomingAudits = frameworks.filter(framework => {
    const nextAudit = new Date(framework.nextAudit);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return nextAudit <= threeMonthsFromNow;
  });

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">
            You don't have permission to access the Compliance Dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security Compliance Dashboard</h2>
          <p className="text-gray-600">
            Regulatory compliance management and automated reporting
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Generate Audit
          </Button>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Award className="h-4 w-4 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Overall Compliance</p>
                <p className="text-2xl font-bold">{overallComplianceScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Open Issues</p>
                <p className="text-2xl font-bold">{totalIssues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Upcoming Audits</p>
                <p className="text-2xl font-bold">{upcomingAudits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Frameworks</p>
                <p className="text-2xl font-bold">{frameworks.length}</p>
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
        
        <Select value={selectedFramework} onValueChange={setSelectedFramework}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Framework" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frameworks</SelectItem>
            {frameworks.map(framework => (
              <SelectItem key={framework.id} value={framework.id}>
                {framework.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="non_compliant">Non-Compliant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Compliance Tabs */}
      <Tabs defaultValue="frameworks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
        </TabsList>

        <TabsContent value="frameworks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {frameworks
              .filter(framework => selectedFramework === 'all' || framework.id === selectedFramework)
              .filter(framework => filterStatus === 'all' || framework.status === filterStatus)
              .map((framework) => (
                <Card key={framework.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        {getStatusIcon(framework.status)}
                        <span>{framework.name}</span>
                      </CardTitle>
                      <Badge className={getStatusColor(framework.status)}>
                        {framework.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription>{framework.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Compliance Score */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Compliance Score</span>
                          <span className="text-sm font-bold">{framework.score}%</span>
                        </div>
                        <Progress value={framework.score} className="h-2" />
                      </div>

                      {/* Framework Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Last Audit:</span>
                          <p className="font-medium">{new Date(framework.lastAudit).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Next Audit:</span>
                          <p className="font-medium">{new Date(framework.nextAudit).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Auditor:</span>
                          <p className="font-medium">{framework.auditor}</p>
                        </div>
                        {framework.certificateExpiry && (
                          <div>
                            <span className="text-gray-600">Certificate Expires:</span>
                            <p className="font-medium">{new Date(framework.certificateExpiry).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>

                      {/* Issues and Requirements Summary */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm">
                            <span className="text-gray-600">Requirements:</span>
                            <span className="font-medium ml-1">{framework.requirements.length}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Issues:</span>
                            <span className={`font-medium ml-1 ${framework.issues.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {framework.issues.length}
                            </span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <div className="space-y-4">
            {frameworks
              .filter(framework => selectedFramework === 'all' || framework.id === selectedFramework)
              .map((framework) => (
                <Card key={framework.id}>
                  <CardHeader>
                    <CardTitle>{framework.name} - Requirements</CardTitle>
                    <CardDescription>Control requirements and compliance status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {framework.requirements.map((requirement) => (
                        <div key={requirement.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {getStatusIcon(requirement.status)}
                                <h4 className="font-semibold text-gray-900">{requirement.control}</h4>
                                <Badge className={getStatusColor(requirement.status)}>
                                  {requirement.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <Badge className={getPriorityColor(requirement.priority)}>
                                  {requirement.priority.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{requirement.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>Assigned to: {requirement.assignedTo}</span>
                                <span>Last reviewed: {new Date(requirement.lastReviewed).toLocaleDateString()}</span>
                                <span>Evidence: {requirement.evidence.length} items</span>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              <FileText className="h-4 w-4 mr-2" />
                              Evidence
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="space-y-4">
            {frameworks
              .filter(framework => framework.issues.length > 0)
              .filter(framework => selectedFramework === 'all' || framework.id === selectedFramework)
              .map((framework) => (
                <Card key={framework.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span>{framework.name} - Open Issues</span>
                      <Badge variant="destructive">{framework.issues.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {framework.issues.map((issue) => (
                        <div 
                          key={issue.id} 
                          className={`p-4 rounded-lg border-l-4 ${
                            issue.severity === ThreatLevel.CRITICAL ? 'border-red-500 bg-red-50' :
                            issue.severity === ThreatLevel.HIGH ? 'border-orange-500 bg-orange-50' :
                            issue.severity === ThreatLevel.MEDIUM ? 'border-yellow-500 bg-yellow-50' :
                            'border-blue-500 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-semibold text-gray-900">Control: {issue.control}</h4>
                                <Badge variant={
                                  issue.severity === ThreatLevel.CRITICAL ? 'destructive' :
                                  issue.severity === ThreatLevel.HIGH ? 'destructive' :
                                  'default'
                                }>
                                  {issue.severity.toUpperCase()}
                                </Badge>
                                <Badge className={
                                  issue.status === 'open' ? 'bg-red-100 text-red-800' :
                                  issue.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }>
                                  {issue.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-600">
                                <span>Due: {new Date(issue.dueDate).toLocaleDateString()}</span>
                                <span>Days remaining: {Math.ceil((new Date(issue.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="outline">
                                <Settings className="h-4 w-4 mr-2" />
                                Assign
                              </Button>
                              <Button size="sm" variant="outline">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Resolve
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Schedule</CardTitle>
                  <CardDescription>Upcoming and recent audits across all frameworks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {frameworks.map((framework) => (
                      <div key={framework.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-semibold text-gray-900">{framework.name}</h4>
                          <p className="text-sm text-gray-600">Auditor: {framework.auditor}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span>Last: {new Date(framework.lastAudit).toLocaleDateString()}</span>
                            <span>Next: {new Date(framework.nextAudit).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(framework.status)}>
                            {framework.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <p className="text-sm font-bold text-gray-900 mt-1">{framework.score}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Trail</CardTitle>
                  <CardDescription>Recent compliance activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auditTrail.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="border-l-2 border-gray-200 pl-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{entry.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {entry.framework}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{entry.details}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{entry.user}</span>
                          <span>•</span>
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Compliance Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Audit
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    Create Assessment
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Documentation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reporting" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Reports</CardTitle>
                <CardDescription>Generate and export compliance documentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Executive Summary Report</h4>
                      <p className="text-sm text-gray-600">High-level compliance overview for leadership</p>
                    </div>
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Detailed Audit Report</h4>
                      <p className="text-sm text-gray-600">Comprehensive compliance assessment</p>
                    </div>
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Gap Analysis Report</h4>
                      <p className="text-sm text-gray-600">Identifies compliance gaps and remediation plans</p>
                    </div>
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Evidence Package</h4>
                      <p className="text-sm text-gray-600">Compilation of compliance evidence and documentation</p>
                    </div>
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Package
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automated Monitoring</CardTitle>
                <CardDescription>Real-time compliance monitoring and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Continuous Monitoring</span>
                    <Badge className="bg-green-100 text-green-800">ACTIVE</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Alert Notifications</span>
                    <Badge className="bg-blue-100 text-blue-800">ENABLED</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Auto-Report Generation</span>
                    <Badge className="bg-green-100 text-green-800">SCHEDULED</Badge>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-2">Monitoring Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Controls checked daily</span>
                        <span className="font-medium">847</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Automated assessments</span>
                        <span className="font-medium">24/7</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Compliance alerts sent</span>
                        <span className="font-medium">12 (this month)</span>
                      </div>
                    </div>
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