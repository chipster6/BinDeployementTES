"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Shield, 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { SecurityMetrics } from '@/lib/types';

interface SecurityMetricsPanelProps {
  metrics: SecurityMetrics | null;
  className?: string;
}

export function SecurityMetricsPanel({ metrics, className }: SecurityMetricsPanelProps) {
  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthStatus = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const getRiskLevel = (score: number): { level: string; color: string } => {
    if (score <= 20) return { level: 'Low', color: 'text-green-600' };
    if (score <= 50) return { level: 'Medium', color: 'text-yellow-600' };
    if (score <= 80) return { level: 'High', color: 'text-orange-600' };
    return { level: 'Critical', color: 'text-red-600' };
  };

  const riskInfo = getRiskLevel(metrics.riskScore);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Security Metrics</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* System Health Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">System Health</h3>
            <Badge 
              variant={metrics.systemHealth >= 90 ? 'default' : metrics.systemHealth >= 70 ? 'secondary' : 'destructive'}
            >
              {getHealthStatus(metrics.systemHealth)}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Health Score</span>
              <span className={`text-sm font-bold ${getHealthColor(metrics.systemHealth)}`}>
                {metrics.systemHealth}%
              </span>
            </div>
            <Progress value={metrics.systemHealth} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Compliance Score</span>
              <span className={`text-sm font-bold ${getHealthColor(metrics.complianceScore)}`}>
                {metrics.complianceScore}%
              </span>
            </div>
            <Progress value={metrics.complianceScore} className="h-2" />
          </div>
        </div>

        {/* Threat Statistics */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Threat Statistics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Detected</span>
              </div>
              <p className="text-2xl font-bold">{metrics.threatsDetected}</p>
              <p className="text-xs text-muted-foreground">Last 24h</p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Blocked</span>
              </div>
              <p className="text-2xl font-bold">{metrics.threatsBlocked}</p>
              <p className="text-xs text-muted-foreground">Automated + Manual</p>
            </div>
          </div>

          {/* Block Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Block Rate</span>
              <span className="text-sm font-bold text-green-600">
                {metrics.threatsDetected > 0 
                  ? Math.round((metrics.threatsBlocked / metrics.threatsDetected) * 100)
                  : 0}%
              </span>
            </div>
            <Progress 
              value={metrics.threatsDetected > 0 
                ? (metrics.threatsBlocked / metrics.threatsDetected) * 100
                : 0} 
              className="h-2" 
            />
          </div>
        </div>

        {/* Incident Response */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Incident Response</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Open</span>
              </div>
              <p className="text-2xl font-bold">{metrics.incidentsOpen}</p>
              <p className="text-xs text-muted-foreground">Active incidents</p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Resolved</span>
              </div>
              <p className="text-2xl font-bold">{metrics.incidentsResolved}</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Avg Response Time</span>
              </div>
              <span className="text-sm font-bold">
                {metrics.averageResponseTime}m
              </span>
            </div>
            
            {/* Response Time Indicator */}
            <div className="flex items-center space-x-2">
              {metrics.averageResponseTime <= 15 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : metrics.averageResponseTime <= 30 ? (
                <Activity className="h-4 w-4 text-yellow-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs text-muted-foreground">
                {metrics.averageResponseTime <= 15 
                  ? 'Excellent response time'
                  : metrics.averageResponseTime <= 30
                  ? 'Good response time'
                  : 'Response time needs improvement'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Risk Assessment</h3>
          
          <div className="p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Risk Level</span>
              <Badge 
                variant={
                  riskInfo.level === 'Low' ? 'default' :
                  riskInfo.level === 'Medium' ? 'secondary' :
                  riskInfo.level === 'High' ? 'secondary' : 'destructive'
                }
              >
                {riskInfo.level}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Risk Score</span>
                <span className={`text-sm font-bold ${riskInfo.color}`}>
                  {metrics.riskScore}/100
                </span>
              </div>
              <Progress 
                value={metrics.riskScore} 
                className="h-2"
              />
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              {riskInfo.level === 'Low' && 'System security is performing well with minimal risks detected.'}
              {riskInfo.level === 'Medium' && 'Some security concerns detected. Monitor closely.'}
              {riskInfo.level === 'High' && 'Elevated security risks detected. Immediate attention recommended.'}
              {riskInfo.level === 'Critical' && 'Critical security risks detected. Immediate action required.'}
            </p>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Performance Indicators</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Detection Rate</span>
              </div>
              <span className="text-sm font-bold">
                {metrics.threatsDetected > 0 ? '99.2%' : 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">False Positive Rate</span>
              </div>
              <span className="text-sm font-bold">2.1%</span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm font-medium">System Uptime</span>
              </div>
              <span className="text-sm font-bold">99.9%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}