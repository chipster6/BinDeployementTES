"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock,
  FileText,
  Download,
  Calendar,
  Settings,
  Eye,
  Filter
} from 'lucide-react';
import { 
  ComplianceStatus, 
  ComplianceIssue, 
  SecurityAuditLog,
  ThreatLevel 
} from '@/lib/types';

interface ComplianceStatusPanelProps {
  className?: string;
}

export function ComplianceStatusPanel({ className }: ComplianceStatusPanelProps) {
  const [complianceData, setComplianceData] = useState<ComplianceStatus[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadComplianceData();
    loadAuditLogs();
  }, []);

  const loadComplianceData = async () => {
    try {
      const response = await fetch('/api/security/compliance');
      const data = await response.json();
      
      if (data.success) {
        setComplianceData(data.data);
      }
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/security/audit-logs?limit=20');
      const data = await response.json();
      
      if (data.success) {
        setAuditLogs(data.data);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getComplianceStatusColor = (status: string): string => {
    switch (status) {
      case 'compliant': return 'default';
      case 'non_compliant': return 'destructive';
      case 'partial': return 'secondary';
      case 'unknown': return 'outline';
      default: return 'outline';
    }
  };

  const getComplianceStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'non_compliant': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'unknown': return <Clock className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getIssueSeverityColor = (severity: ThreatLevel): string => {
    switch (severity) {
      case ThreatLevel.CRITICAL: return 'destructive';
      case ThreatLevel.HIGH: return 'destructive';
      case ThreatLevel.MEDIUM: return 'default';
      case ThreatLevel.LOW: return 'secondary';
      default: return 'secondary';
    }
  };

  const getAuditResultColor = (result: string): string => {
    switch (result) {
      case 'success': return 'text-green-600';
      case 'failure': return 'text-red-600';
      case 'blocked': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getAuditResultIcon = (result: string) => {
    switch (result) {
      case 'success': return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'failure': return <XCircle className="h-3 w-3 text-red-600" />;
      case 'blocked': return <Shield className="h-3 w-3 text-orange-600" />;
      default: return <Clock className="h-3 w-3 text-gray-600" />;
    }
  };

  const generateComplianceReport = async (framework: string) => {
    try {
      const response = await fetch(`/api/security/compliance/${framework}/report`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${framework}-compliance-report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
    }
  };

  const filteredComplianceData = selectedFramework === 'all' 
    ? complianceData 
    : complianceData.filter(item => item.framework === selectedFramework);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Compliance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Compliance Status</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Frameworks</option>
                <option value="GDPR">GDPR</option>
                <option value="PCI_DSS">PCI DSS</option>
                <option value="SOC2">SOC 2</option>
                <option value="HIPAA">HIPAA</option>
                <option value="ISO27001">ISO 27001</option>
              </select>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-4">
            {filteredComplianceData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No compliance data available</p>
              </div>
            ) : (
              filteredComplianceData.map((compliance) => (
                <div key={compliance.framework} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getComplianceStatusIcon(compliance.status)}
                      <h3 className="text-lg font-semibold">{compliance.framework}</h3>
                      <Badge variant={getComplianceStatusColor(compliance.status) as any}>
                        {compliance.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{compliance.score}%</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateComplianceReport(compliance.framework)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Report
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <Progress value={compliance.score} className="h-2" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Last audit: {new Date(compliance.lastAudit).toLocaleDateString()}</span>
                      <span>Next audit: {new Date(compliance.nextAudit).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {compliance.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center space-x-2">
                        <span>Outstanding Issues</span>
                        <Badge variant="outline">{compliance.issues.length}</Badge>
                      </h4>
                      
                      <div className="space-y-2">
                        {compliance.issues.slice(0, 3).map((issue) => (
                          <div key={issue.id} className="flex items-start space-x-3 p-2 border rounded">
                            <Badge variant={getIssueSeverityColor(issue.severity) as any} className="text-xs">
                              {issue.severity}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{issue.control}</p>
                              <p className="text-xs text-muted-foreground">{issue.description}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  Due: {new Date(issue.dueDate).toLocaleDateString()}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {issue.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {compliance.issues.length > 3 && (
                          <div className="text-center">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View {compliance.issues.length - 3} more issues
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Security Audit Trail</span>
            <Badge variant="outline">{auditLogs.length}</Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs available</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getAuditResultIcon(log.result)}
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.resource}
                          </Badge>
                          <span className={`text-sm font-medium ${getAuditResultColor(log.result)}`}>
                            {log.result.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center space-x-4">
                            <span>User: {log.userEmail}</span>
                            <span>IP: {log.ipAddress}</span>
                          </div>
                          <div>
                            Timestamp: {new Date(log.timestamp).toLocaleString()}
                          </div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2">
                              <details className="text-xs">
                                <summary className="cursor-pointer">View details</summary>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {auditLogs.length > 0 && (
              <div className="text-center pt-4 border-t">
                <Button variant="outline" size="sm" onClick={loadAuditLogs}>
                  Load More Logs
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Compliant Frameworks
                </p>
                <p className="text-2xl font-bold">
                  {complianceData.filter(c => c.status === 'compliant').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Partial Compliance
                </p>
                <p className="text-2xl font-bold">
                  {complianceData.filter(c => c.status === 'partial').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Non-Compliant
                </p>
                <p className="text-2xl font-bold">
                  {complianceData.filter(c => c.status === 'non_compliant').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Upcoming Audits
                </p>
                <p className="text-2xl font-bold">
                  {complianceData.filter(c => {
                    const nextAudit = new Date(c.nextAudit);
                    const thirtyDaysFromNow = new Date();
                    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                    return nextAudit <= thirtyDaysFromNow;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}