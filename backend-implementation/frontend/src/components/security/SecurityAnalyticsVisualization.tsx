'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  AlertTriangle,
  Brain,
  Target,
  Zap,
  Globe,
  Clock,
  Users,
  Server,
  Database,
  Network,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Settings,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { ThreatLevel, UserRole } from '@/lib/types';

interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  category: 'threat' | 'compliance' | 'performance' | 'business';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: string;
  prediction?: {
    nextPeriodValue: number;
    confidence: number;
    factors: string[];
  };
}

interface SecurityTrendData {
  period: string;
  threatDetections: number;
  falsePositives: number;
  incidentResolution: number;
  complianceScore: number;
  systemHealth: number;
  userActivity: number;
}

interface RiskAssessment {
  assetId: string;
  assetName: string;
  riskScore: number;
  vulnerabilities: number;
  threatExposure: number;
  businessImpact: number;
  recommendations: string[];
  lastAssessed: string;
}

interface ThreatVector {
  vector: string;
  frequency: number;
  severity: ThreatLevel;
  successRate: number;
  detectionRate: number;
  impact: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface SecurityAnalyticsProps {
  userRole: UserRole;
  timeRange: '24h' | '7d' | '30d' | '90d';
  className?: string;
}

export default function SecurityAnalyticsVisualization({ userRole, timeRange = '7d', className }: SecurityAnalyticsProps) {
  const [metrics, setMetrics] = useState<SecurityMetric[]>([
    {
      id: 'threat-detection-rate',
      name: 'Threat Detection Rate',
      value: 94.7,
      previousValue: 91.2,
      trend: 'up',
      unit: '%',
      category: 'threat',
      criticality: 'high',
      lastUpdated: new Date().toISOString(),
      prediction: {
        nextPeriodValue: 95.2,
        confidence: 87.5,
        factors: ['ML model improvement', 'New threat signatures', 'Behavioral analytics']
      }
    },
    {
      id: 'false-positive-rate',
      name: 'False Positive Rate',
      value: 2.3,
      previousValue: 3.1,
      trend: 'down',
      unit: '%',
      category: 'performance',
      criticality: 'medium',
      lastUpdated: new Date().toISOString(),
      prediction: {
        nextPeriodValue: 2.1,
        confidence: 82.1,
        factors: ['Algorithm tuning', 'Training data quality', 'Context awareness']
      }
    },
    {
      id: 'mean-response-time',
      name: 'Mean Time to Response',
      value: 12.4,
      previousValue: 15.7,
      trend: 'down',
      unit: 'minutes',
      category: 'performance',
      criticality: 'high',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'compliance-score',
      name: 'Overall Compliance Score',
      value: 92.8,
      previousValue: 89.5,
      trend: 'up',
      unit: '%',
      category: 'compliance',
      criticality: 'critical',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'security-roi',
      name: 'Security ROI',
      value: 340,
      previousValue: 315,
      trend: 'up',
      unit: '%',
      category: 'business',
      criticality: 'high',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'vulnerability-exposure',
      name: 'Critical Vulnerability Exposure',
      value: 3,
      previousValue: 7,
      trend: 'down',
      unit: 'count',
      category: 'threat',
      criticality: 'critical',
      lastUpdated: new Date().toISOString()
    }
  ]);

  const [trendData, setTrendData] = useState<SecurityTrendData[]>([
    { period: 'Week 1', threatDetections: 1247, falsePositives: 29, incidentResolution: 87.2, complianceScore: 89.5, systemHealth: 94.1, userActivity: 1856 },
    { period: 'Week 2', threatDetections: 1189, falsePositives: 31, incidentResolution: 89.7, complianceScore: 90.2, systemHealth: 95.3, userActivity: 1923 },
    { period: 'Week 3', threatDetections: 1312, falsePositives: 27, incidentResolution: 91.4, complianceScore: 91.8, systemHealth: 93.7, userActivity: 2014 },
    { period: 'Week 4', threatDetections: 1276, falsePositives: 24, incidentResolution: 93.1, complianceScore: 92.8, systemHealth: 96.2, userActivity: 2087 }
  ]);

  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([
    {
      assetId: 'asset-001',
      assetName: 'Customer Database Server',
      riskScore: 87,
      vulnerabilities: 3,
      threatExposure: 92,
      businessImpact: 95,
      recommendations: ['Update database patches', 'Implement additional monitoring', 'Review access controls'],
      lastAssessed: new Date(Date.now() - 86400000).toISOString()
    },
    {
      assetId: 'asset-002',
      assetName: 'Route Optimization Service',
      riskScore: 72,
      vulnerabilities: 1,
      threatExposure: 68,
      businessImpact: 85,
      recommendations: ['Code security review', 'Input validation enhancement'],
      lastAssessed: new Date(Date.now() - 172800000).toISOString()
    },
    {
      assetId: 'asset-003',
      assetName: 'Payment Processing Gateway',
      riskScore: 91,
      vulnerabilities: 2,
      threatExposure: 88,
      businessImpact: 98,
      recommendations: ['PCI DSS compliance review', 'Encryption key rotation', 'Network segmentation'],
      lastAssessed: new Date(Date.now() - 259200000).toISOString()
    }
  ]);

  const [threatVectors, setThreatVectors] = useState<ThreatVector[]>([
    {
      vector: 'Phishing Attacks',
      frequency: 156,
      severity: ThreatLevel.MEDIUM,
      successRate: 12.5,
      detectionRate: 94.2,
      impact: 3.2,
      trend: 'increasing'
    },
    {
      vector: 'Malware Infections',
      frequency: 89,
      severity: ThreatLevel.HIGH,
      successRate: 8.7,
      detectionRate: 97.1,
      impact: 6.8,
      trend: 'decreasing'
    },
    {
      vector: 'DDoS Attacks',
      frequency: 34,
      severity: ThreatLevel.MEDIUM,
      successRate: 23.5,
      detectionRate: 89.4,
      impact: 4.1,
      trend: 'stable'
    },
    {
      vector: 'Insider Threats',
      frequency: 12,
      severity: ThreatLevel.CRITICAL,
      successRate: 41.7,
      detectionRate: 76.3,
      impact: 9.2,
      trend: 'increasing'
    },
    {
      vector: 'SQL Injection',
      frequency: 67,
      severity: ThreatLevel.HIGH,
      successRate: 15.2,
      detectionRate: 91.8,
      impact: 7.5,
      trend: 'decreasing'
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(timeRange);
  const [isLoading, setIsLoading] = useState(false);

  const hasAccess = [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(userRole);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string, value: number, previousValue: number) => {
    const isImprovement = (
      (trend === 'up' && value > previousValue) ||
      (trend === 'down' && value < previousValue)
    );
    
    if (trend === 'up') {
      return <TrendingUp className={`h-4 w-4 ${isImprovement ? 'text-green-600' : 'text-red-600'}`} />;
    } else if (trend === 'down') {
      return <TrendingDown className={`h-4 w-4 ${isImprovement ? 'text-green-600' : 'text-red-600'}`} />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 90) return 'text-red-600 bg-red-100';
    if (score >= 70) return 'text-orange-600 bg-orange-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getSeverityColor = (severity: ThreatLevel) => {
    switch (severity) {
      case ThreatLevel.CRITICAL: return 'bg-red-100 text-red-800';
      case ThreatLevel.HIGH: return 'bg-orange-100 text-orange-800';
      case ThreatLevel.MEDIUM: return 'bg-yellow-100 text-yellow-800';
      case ThreatLevel.LOW: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMetrics = metrics.filter(metric => 
    selectedCategory === 'all' || metric.category === selectedCategory
  );

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground">
            You don't have permission to access Security Analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Analytics Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security Analytics</h2>
          <p className="text-gray-600">
            Advanced security metrics with predictive intelligence and threat analysis
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
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
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Category:</span>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Metric Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="threat">Threat Detection</SelectItem>
            <SelectItem value="compliance">Compliance</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="business">Business Impact</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline" className="ml-auto">
          {filteredMetrics.length} metrics displayed
        </Badge>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="threats">Threat Vectors</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMetrics.map((metric) => (
              <Card key={metric.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-700">{metric.name}</CardTitle>
                    <Badge className={getCriticalityColor(metric.criticality)}>
                      {metric.criticality.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-bold text-gray-900">
                        {metric.value}{metric.unit}
                      </div>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(metric.trend, metric.value, metric.previousValue)}
                        <span className={`text-sm font-medium ${
                          metric.trend === 'up' && metric.value > metric.previousValue ? 'text-green-600' :
                          metric.trend === 'down' && metric.value < metric.previousValue ? 'text-green-600' :
                          'text-red-600'
                        }`}>
                          {Math.abs(((metric.value - metric.previousValue) / metric.previousValue) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      vs. previous period: {metric.previousValue}{metric.unit}
                    </div>

                    {metric.prediction && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">Next Period Prediction:</span>
                          <span className="text-xs font-bold text-blue-600">
                            {metric.prediction.nextPeriodValue}{metric.unit}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Progress value={metric.prediction.confidence} className="flex-1 h-1" />
                          <span className="text-xs text-gray-500">{metric.prediction.confidence}% confidence</span>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Updated: {new Date(metric.lastUpdated).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5 text-blue-600" />
                  <span>Security Metrics Trends</span>
                </CardTitle>
                <CardDescription>Historical performance across key security indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
                  <div className="text-center space-y-2">
                    <LineChart className="h-16 w-16 text-blue-400 mx-auto" />
                    <p className="text-lg font-medium text-blue-700">Interactive Trend Chart</p>
                    <p className="text-sm text-blue-600">Multi-metric time series visualization</p>
                    <p className="text-xs text-blue-500">Recharts/D3.js integration ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <span>Performance Comparison</span>
                </CardTitle>
                <CardDescription>Period-over-period security performance analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trendData.slice(-4).map((data, index) => (
                    <div key={data.period} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-gray-900">{data.period}</div>
                        <Badge variant="outline" className="text-xs">
                          {data.complianceScore}% compliance
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-gray-600">
                          <span className="font-medium text-blue-600">{data.threatDetections}</span> threats
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-red-600">{data.falsePositives}</span> FP
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium text-green-600">{data.incidentResolution}%</span> resolved
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                <span>Security Investment Distribution</span>
              </CardTitle>
              <CardDescription>Budget allocation across security domains</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center border-2 border-dashed border-purple-200">
                  <div className="text-center space-y-2">
                    <PieChart className="h-12 w-12 text-purple-400 mx-auto" />
                    <p className="text-sm font-medium text-purple-700">Investment Distribution</p>
                    <p className="text-xs text-purple-600">Interactive pie chart visualization</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Security Budget Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-sm text-red-800">Threat Detection & Response</span>
                      <span className="text-sm font-bold text-red-900">35%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm text-blue-800">Compliance & Governance</span>
                      <span className="text-sm font-bold text-blue-900">25%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm text-green-800">Infrastructure Security</span>
                      <span className="text-sm font-bold text-green-900">20%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <span className="text-sm text-purple-800">Security Training</span>
                      <span className="text-sm font-bold text-purple-900">10%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                      <span className="text-sm text-orange-800">Research & Innovation</span>
                      <span className="text-sm font-bold text-orange-900">10%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {threatVectors.map((vector, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{vector.vector}</CardTitle>
                    <Badge className={getSeverityColor(vector.severity)}>
                      {vector.severity.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Frequency</span>
                        <p className="text-xl font-bold text-gray-900">{vector.frequency}</p>
                        <p className="text-xs text-gray-500">attempts detected</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Success Rate</span>
                        <p className="text-xl font-bold text-red-600">{vector.successRate}%</p>
                        <p className="text-xs text-gray-500">successful attacks</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Detection Rate</span>
                        <span className="text-sm font-bold text-green-600">{vector.detectionRate}%</span>
                      </div>
                      <Progress value={vector.detectionRate} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Impact Score:</span>
                        <span className="font-medium">{vector.impact}/10</span>
                      </div>
                      <Badge className={
                        vector.trend === 'increasing' ? 'bg-red-100 text-red-800' :
                        vector.trend === 'decreasing' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {vector.trend.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="space-y-4">
            {riskAssessments.map((assessment) => (
              <Card key={assessment.assetId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span>{assessment.assetName}</span>
                    </CardTitle>
                    <Badge className={getRiskScoreColor(assessment.riskScore)}>
                      Risk Score: {assessment.riskScore}
                    </Badge>
                  </div>
                  <CardDescription>
                    Last assessed: {new Date(assessment.lastAssessed).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900">Risk Factors</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Vulnerabilities</span>
                          <span className="font-medium text-red-600">{assessment.vulnerabilities}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Threat Exposure</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={assessment.threatExposure} className="w-16 h-2" />
                            <span className="text-sm font-medium">{assessment.threatExposure}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Business Impact</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={assessment.businessImpact} className="w-16 h-2" />
                            <span className="text-sm font-medium">{assessment.businessImpact}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <h4 className="font-semibold text-gray-900">Recommendations</h4>
                      <div className="space-y-2">
                        {assessment.recommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{recommendation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <span>AI-Powered Predictions</span>
                </CardTitle>
                <CardDescription>Machine learning insights and security forecasts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.filter(m => m.prediction).map((metric) => (
                    <div key={metric.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{metric.name}</h4>
                        <Badge className="bg-purple-100 text-purple-800">
                          {metric.prediction!.confidence}% confidence
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Current: {metric.value}{metric.unit}</span>
                        <span className="text-sm font-bold text-purple-600">
                          Predicted: {metric.prediction!.nextPeriodValue}{metric.unit}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Key factors: {metric.prediction!.factors.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <span>Predictive Alerts</span>
                </CardTitle>
                <CardDescription>Early warning system for security risks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Potential Threat Increase</h4>
                      <p className="text-sm text-yellow-700">
                        15% increase in phishing attempts predicted for next week
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Confidence: 84% | Based on seasonal patterns and threat intelligence
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">System Performance Optimization</h4>
                      <p className="text-sm text-blue-700">
                        Security scanning workload will peak on Thursday
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Confidence: 91% | Schedule maintenance accordingly
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-800">Compliance Improvement</h4>
                      <p className="text-sm text-green-700">
                        Overall compliance score expected to reach 95% next month
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Confidence: 87% | Recent policy updates showing positive impact
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-orange-600" />
                <span>Predictive Model Performance</span>
              </CardTitle>
              <CardDescription>AI model accuracy and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">91.4%</div>
                  <div className="text-sm text-gray-600">Prediction Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">87.2%</div>
                  <div className="text-sm text-gray-600">Model Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">2.3%</div>
                  <div className="text-sm text-gray-600">False Alert Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">15min</div>
                  <div className="text-sm text-gray-600">Processing Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}