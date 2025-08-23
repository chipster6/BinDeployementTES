'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  Eye, 
  Clock,
  Target,
  Activity,
  Globe,
  Lock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  Brain,
  Zap,
  FileText,
  BarChart3
} from 'lucide-react';

interface SecurityExecutiveMetrics {
  securityPosture: {
    overallScore: number;
    previousScore: number;
    trend: 'up' | 'down' | 'stable';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  threatLandscape: {
    threatsDetected: number;
    threatsBlocked: number;
    activeIncidents: number;
    averageResponseTime: number;
    threatIntelligenceScore: number;
  };
  complianceStatus: {
    overallCompliance: number;
    gdpr: number;
    pciDss: number;
    soc2: number;
    iso27001: number;
    upcomingAudits: number;
  };
  businessImpact: {
    protectedRevenue: number;
    securityROI: number;
    downtimePrevented: number;
    costAvoidance: number;
    reputationProtection: number;
  };
  aiSecurity: {
    mlThreatDetection: number;
    behavioralAnalytics: number;
    predictiveAccuracy: number;
    automatedResponse: number;
    falsePositiveRate: number;
  };
}

interface SecurityTrend {
  period: string;
  securityScore: number;
  incidents: number;
  threatDetections: number;
  complianceScore: number;
}

interface ExecutiveAlert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'threat' | 'compliance' | 'operational' | 'strategic';
  impact: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost?: number;
  actionRequired: boolean;
  dueDate?: string;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved';
}

export default function SecurityExecutiveDashboard() {
  const [metrics, setMetrics] = useState<SecurityExecutiveMetrics>({
    securityPosture: {
      overallScore: 94.7,
      previousScore: 89.2,
      trend: 'up',
      riskLevel: 'low'
    },
    threatLandscape: {
      threatsDetected: 1247,
      threatsBlocked: 1189,
      activeIncidents: 3,
      averageResponseTime: 12,
      threatIntelligenceScore: 87.5
    },
    complianceStatus: {
      overallCompliance: 92.3,
      gdpr: 95.8,
      pciDss: 91.2,
      soc2: 89.6,
      iso27001: 93.1,
      upcomingAudits: 2
    },
    businessImpact: {
      protectedRevenue: 2150000,
      securityROI: 340,
      downtimePrevented: 99.7,
      costAvoidance: 485000,
      reputationProtection: 96.8
    },
    aiSecurity: {
      mlThreatDetection: 91.4,
      behavioralAnalytics: 88.7,
      predictiveAccuracy: 85.2,
      automatedResponse: 94.1,
      falsePositiveRate: 2.3
    }
  });

  const [trends, setTrends] = useState<SecurityTrend[]>([
    { period: 'Q1 2024', securityScore: 87.2, incidents: 12, threatDetections: 1156, complianceScore: 89.1 },
    { period: 'Q2 2024', securityScore: 89.8, incidents: 8, threatDetections: 1203, complianceScore: 90.7 },
    { period: 'Q3 2024', securityScore: 92.1, incidents: 5, threatDetections: 1189, complianceScore: 91.8 },
    { period: 'Q4 2024', securityScore: 94.7, incidents: 3, threatDetections: 1247, complianceScore: 92.3 }
  ]);

  const [executiveAlerts, setExecutiveAlerts] = useState<ExecutiveAlert[]>([
    {
      id: '1',
      title: 'Advanced Persistent Threat Detected',
      description: 'Sophisticated attack campaign targeting waste management infrastructure detected across multiple endpoints.',
      severity: 'critical',
      category: 'threat',
      impact: 'critical',
      estimatedCost: 125000,
      actionRequired: true,
      dueDate: '2024-12-25',
      status: 'in_progress'
    },
    {
      id: '2',
      title: 'SOC 2 Audit Preparation Required',
      description: 'Annual SOC 2 Type II audit scheduled for Q1 2025. Security controls assessment needed.',
      severity: 'warning',
      category: 'compliance',
      impact: 'medium',
      actionRequired: true,
      dueDate: '2025-02-15',
      status: 'acknowledged'
    },
    {
      id: '3',
      title: 'AI Security Model Performance Degradation',
      description: 'ML threat detection accuracy dropped below 90% threshold. Model retraining recommended.',
      severity: 'warning',
      category: 'operational',
      impact: 'medium',
      actionRequired: true,
      status: 'new'
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLastUpdated(new Date());
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-blue-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Eye className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Executive Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Executive Dashboard</h1>
          <p className="text-lg text-gray-600 mt-1">
            Strategic security intelligence and business impact analysis for executive decision making
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" className="h-9">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Executive KPIs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Security Posture */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-800">Security Posture</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold mb-2 ${getScoreColor(metrics.securityPosture.overallScore)}`}>
              {formatPercentage(metrics.securityPosture.overallScore)}
            </div>
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                +{(metrics.securityPosture.overallScore - metrics.securityPosture.previousScore).toFixed(1)}% improvement
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700">Risk Level</span>
              <Badge className={getRiskLevelColor(metrics.securityPosture.riskLevel)}>
                {metrics.securityPosture.riskLevel.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Business Impact */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-800">Protected Revenue</CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-2">
              {formatCurrency(metrics.businessImpact.protectedRevenue)}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Security ROI</span>
                <span className="text-sm font-medium text-green-800">
                  {metrics.businessImpact.securityROI}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Cost avoidance</span>
                <span className="text-sm font-medium text-green-800">
                  {formatCurrency(metrics.businessImpact.costAvoidance)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-green-700">Uptime protection</span>
                <span className="font-medium text-green-800">
                  {formatPercentage(metrics.businessImpact.downtimePrevented)}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.businessImpact.downtimePrevented}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Threat Intelligence */}
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-red-800">Threat Landscape</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900 mb-2">
              {metrics.threatLandscape.activeIncidents}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-700">Threats blocked</span>
                <span className="text-sm font-medium text-green-600">
                  {metrics.threatLandscape.threatsBlocked}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-700">Response time</span>
                <span className="text-sm font-medium text-red-800">
                  {metrics.threatLandscape.averageResponseTime}min
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-red-700">Threat Intel Score</span>
                <span className="font-medium text-red-800">
                  {formatPercentage(metrics.threatLandscape.threatIntelligenceScore)}
                </span>
              </div>
              <div className="w-full bg-red-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.threatLandscape.threatIntelligenceScore}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Security */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-purple-800">AI Security Intelligence</CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-2">
              {formatPercentage(metrics.aiSecurity.mlThreatDetection)}
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">Predictive accuracy</span>
                <span className="text-sm font-medium text-purple-800">
                  {formatPercentage(metrics.aiSecurity.predictiveAccuracy)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700">False positives</span>
                <span className="text-sm font-medium text-green-600">
                  {formatPercentage(metrics.aiSecurity.falsePositiveRate)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-purple-700">Automated response</span>
                <span className="font-medium text-purple-800">
                  {formatPercentage(metrics.aiSecurity.automatedResponse)}
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.aiSecurity.automatedResponse}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Alerts */}
      {executiveAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Executive Security Alerts</span>
              <Badge variant="destructive">{executiveAlerts.filter(alert => alert.actionRequired).length}</Badge>
            </CardTitle>
            <CardDescription>Critical security issues requiring executive attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {executiveAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                    alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getSeverityIcon(alert.severity)}
                        <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                        <Badge variant={
                          alert.severity === 'critical' ? 'destructive' :
                          alert.severity === 'warning' ? 'default' :
                          'secondary'
                        }>
                          {alert.impact.toUpperCase()} IMPACT
                        </Badge>
                        {alert.estimatedCost && (
                          <Badge variant="outline">
                            Risk: {formatCurrency(alert.estimatedCost)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span>Category: {alert.category}</span>
                        {alert.dueDate && (
                          <span>Due: {new Date(alert.dueDate).toLocaleDateString()}</span>
                        )}
                        <Badge className={
                          alert.status === 'new' ? 'bg-red-100 text-red-800' :
                          alert.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          alert.status === 'acknowledged' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {alert.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    {alert.actionRequired && (
                      <Button size="sm" variant="outline">
                        Take Action
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Security Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
          <TabsTrigger value="business">Business Impact</TabsTrigger>
          <TabsTrigger value="intelligence">Threat Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Security Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Security Posture Trends</span>
                </CardTitle>
                <CardDescription>Quarterly security score evolution and incident reduction</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trends.map((trend, index) => (
                    <div key={trend.period} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-gray-900">{trend.period}</div>
                        <Badge variant="outline" className="text-xs">
                          {formatPercentage(trend.securityScore)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-gray-600">
                          {trend.incidents} incidents
                        </div>
                        <div className="text-sm font-medium text-blue-600">
                          {trend.threatDetections} threats detected
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Security Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <span>AI Security Performance</span>
                </CardTitle>
                <CardDescription>Machine learning and behavioral analytics effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">ML Threat Detection</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-purple-900">
                        {formatPercentage(metrics.aiSecurity.mlThreatDetection)}
                      </span>
                      <div className="w-16 bg-purple-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${metrics.aiSecurity.mlThreatDetection}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Behavioral Analytics</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-purple-900">
                        {formatPercentage(metrics.aiSecurity.behavioralAnalytics)}
                      </span>
                      <div className="w-16 bg-purple-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${metrics.aiSecurity.behavioralAnalytics}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Predictive Accuracy</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-purple-900">
                        {formatPercentage(metrics.aiSecurity.predictiveAccuracy)}
                      </span>
                      <div className="w-16 bg-purple-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${metrics.aiSecurity.predictiveAccuracy}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Automated Response</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-purple-900">
                        {formatPercentage(metrics.aiSecurity.automatedResponse)}
                      </span>
                      <div className="w-16 bg-purple-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${metrics.aiSecurity.automatedResponse}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Regulatory Compliance Status</CardTitle>
                <CardDescription>Current compliance scores across major frameworks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <span className="text-sm font-medium text-green-800">GDPR Compliance</span>
                      <p className="text-xs text-green-600">General Data Protection Regulation</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-green-900">
                        {formatPercentage(metrics.complianceStatus.gdpr)}
                      </span>
                      <CheckCircle className="h-4 w-4 text-green-600 inline ml-2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <span className="text-sm font-medium text-blue-800">PCI DSS</span>
                      <p className="text-xs text-blue-600">Payment Card Industry Data Security Standard</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-blue-900">
                        {formatPercentage(metrics.complianceStatus.pciDss)}
                      </span>
                      <CheckCircle className="h-4 w-4 text-blue-600 inline ml-2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <span className="text-sm font-medium text-purple-800">SOC 2 Type II</span>
                      <p className="text-xs text-purple-600">Service Organization Control 2</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-purple-900">
                        {formatPercentage(metrics.complianceStatus.soc2)}
                      </span>
                      <CheckCircle className="h-4 w-4 text-purple-600 inline ml-2" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <span className="text-sm font-medium text-orange-800">ISO 27001</span>
                      <p className="text-xs text-orange-600">Information Security Management</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-orange-900">
                        {formatPercentage(metrics.complianceStatus.iso27001)}
                      </span>
                      <CheckCircle className="h-4 w-4 text-orange-600 inline ml-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audit Schedule</CardTitle>
                <CardDescription>Upcoming compliance audits and assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Calendar className="h-4 w-4 text-yellow-600" />
                    <div>
                      <span className="text-sm font-medium text-yellow-800">SOC 2 Type II Audit</span>
                      <p className="text-xs text-yellow-600">Due: February 15, 2025</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="text-sm font-medium text-blue-800">PCI DSS Assessment</span>
                      <p className="text-xs text-blue-600">Due: March 30, 2025</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Security ROI</CardTitle>
                <CardDescription>Return on security investment analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {metrics.businessImpact.securityROI}%
                </div>
                <p className="text-sm text-gray-600">
                  Every $1 invested in security generates ${(metrics.businessImpact.securityROI / 100).toFixed(2)} in value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Avoidance</CardTitle>
                <CardDescription>Prevented losses through security measures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {formatCurrency(metrics.businessImpact.costAvoidance)}
                </div>
                <p className="text-sm text-gray-600">
                  Annual cost avoidance from security incidents prevented
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reputation Protection</CardTitle>
                <CardDescription>Brand and customer trust preservation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {formatPercentage(metrics.businessImpact.reputationProtection)}
                </div>
                <p className="text-sm text-gray-600">
                  Customer trust and brand reputation maintained
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <span>Threat Intelligence Summary</span>
              </CardTitle>
              <CardDescription>Strategic threat landscape analysis and predictions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Current Threat Environment</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-sm text-red-800">Ransomware Campaigns</span>
                      <Badge className="bg-red-100 text-red-800">High Activity</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-sm text-yellow-800">Phishing Attempts</span>
                      <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm text-green-800">DDoS Attacks</span>
                      <Badge className="bg-green-100 text-green-800">Low</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Predictive Analysis</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Next 30 Days Forecast</p>
                      <p className="text-xs text-blue-600">
                        15% increase in targeted attacks against waste management sector expected
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm font-medium text-purple-800">AI Threat Prediction</p>
                      <p className="text-xs text-purple-600">
                        85% probability of detecting 3-5 new APT indicators
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}