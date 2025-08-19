"use client";

/**
 * ============================================================================
 * FRONTEND PERFORMANCE MONITOR COMPONENT
 * ============================================================================
 *
 * Real-time frontend performance monitoring component with backend coordination.
 * Integrates with Performance Specialist metrics and provides actionable insights.
 *
 * Features:
 * - Real-time performance metrics visualization
 * - Virtualization performance tracking
 * - Memory usage monitoring
 * - Cache hit ratio analysis
 * - WebSocket performance integration
 * - Accessibility compliance monitoring
 *
 * Coordination Points:
 * - Performance Specialist: Backend metrics integration
 * - Database Architect: Query performance correlation
 * - Innovation Architect: AI-powered performance predictions
 * - External API: Real-time data streaming performance
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Wifi,
  Eye,
  Cpu,
  HardDrive,
  BarChart3
} from 'lucide-react';

/**
 * Performance Metrics Interface (coordinated with backend Performance Specialist)
 */
export interface FrontendPerformanceMetrics {
  // Core Web Vitals
  largestContentfulPaint: number; // LCP
  firstInputDelay: number; // FID
  cumulativeLayoutShift: number; // CLS
  firstContentfulPaint: number; // FCP
  timeToInteractive: number; // TTI
  
  // React Performance
  componentRenderTime: number;
  virtualScrollPerformance: number;
  memoryUsage: number;
  
  // Network Performance
  networkLatency: number;
  cacheHitRatio: number;
  bundleLoadTime: number;
  
  // Real-time Performance
  webSocketLatency?: number;
  realTimeUpdateRate?: number;
  
  // Accessibility Performance
  accessibilityScore: number;
  keyboardNavigationDelay: number;
  
  // Custom Metrics
  customMetrics?: Record<string, number>;
}

/**
 * Performance Thresholds for scoring
 */
const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTI: { good: 3800, needsImprovement: 7300 },
  renderTime: { good: 16, needsImprovement: 50 },
  memoryUsage: { good: 100, needsImprovement: 250 }, // MB
  networkLatency: { good: 100, needsImprovement: 300 },
  cacheHitRatio: { good: 0.8, needsImprovement: 0.5 },
  accessibility: { good: 95, needsImprovement: 80 }
};

/**
 * Performance Status Component
 */
const PerformanceStatus = memo<{ 
  value: number; 
  thresholds: { good: number; needsImprovement: number };
  unit?: string;
  invert?: boolean; // For metrics where lower is better
}>(({ value, thresholds, unit = 'ms', invert = false }) => {
  const getStatus = () => {
    if (invert) {
      if (value <= thresholds.good) return 'good';
      if (value <= thresholds.needsImprovement) return 'needs-improvement';
      return 'poor';
    } else {
      if (value >= thresholds.good) return 'good';
      if (value >= thresholds.needsImprovement) return 'needs-improvement';
      return 'poor';
    }
  };

  const status = getStatus();
  const statusConfig = {
    good: { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
    'needs-improvement': { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: AlertTriangle },
    poor: { color: 'text-red-600 bg-red-50 border-red-200', icon: AlertTriangle }
  };

  const { color, icon: Icon } = statusConfig[status];

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${color}`}>
      <Icon className="h-4 w-4" />
      <span className="font-medium">
        {value.toFixed(value < 10 ? 2 : 0)}{unit}
      </span>
    </div>
  );
});

PerformanceStatus.displayName = 'PerformanceStatus';

/**
 * Core Web Vitals Component
 */
const CoreWebVitals = memo<{ metrics: FrontendPerformanceMetrics }>(({ metrics }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Zap className="h-4 w-4" />
          <span>Largest Contentful Paint</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceStatus 
          value={metrics.largestContentfulPaint} 
          thresholds={PERFORMANCE_THRESHOLDS.LCP}
          invert
        />
        <p className="text-xs text-gray-600 mt-2">
          Measures loading performance
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Activity className="h-4 w-4" />
          <span>First Input Delay</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceStatus 
          value={metrics.firstInputDelay} 
          thresholds={PERFORMANCE_THRESHOLDS.FID}
          invert
        />
        <p className="text-xs text-gray-600 mt-2">
          Measures interactivity
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <TrendingUp className="h-4 w-4" />
          <span>Cumulative Layout Shift</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceStatus 
          value={metrics.cumulativeLayoutShift} 
          thresholds={PERFORMANCE_THRESHOLDS.CLS}
          unit=""
          invert
        />
        <p className="text-xs text-gray-600 mt-2">
          Measures visual stability
        </p>
      </CardContent>
    </Card>
  </div>
));

CoreWebVitals.displayName = 'CoreWebVitals';

/**
 * React Performance Component
 */
const ReactPerformance = memo<{ metrics: FrontendPerformanceMetrics }>(({ metrics }) => {
  const renderScore = metrics.componentRenderTime <= 16 ? 100 : 
    Math.max(0, 100 - (metrics.componentRenderTime - 16) * 2);
  
  const memoryScore = metrics.memoryUsage <= 100 ? 100 :
    Math.max(0, 100 - (metrics.memoryUsage - 100) / 2);
    
  const virtualScrollScore = metrics.virtualScrollPerformance;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Cpu className="h-4 w-4" />
              <span>Component Render Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <PerformanceStatus 
                value={metrics.componentRenderTime} 
                thresholds={PERFORMANCE_THRESHOLDS.renderTime}
                invert
              />
              <Progress value={renderScore} className="h-2" />
              <p className="text-xs text-gray-600">
                Target: &lt;16ms for 60fps
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <HardDrive className="h-4 w-4" />
              <span>Memory Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <PerformanceStatus 
                value={metrics.memoryUsage} 
                thresholds={PERFORMANCE_THRESHOLDS.memoryUsage}
                unit="MB"
                invert
              />
              <Progress value={memoryScore} className="h-2" />
              <p className="text-xs text-gray-600">
                Heap usage monitoring
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Virtual Scroll Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant={virtualScrollScore >= 90 ? "default" : virtualScrollScore >= 70 ? "secondary" : "destructive"}>
                  {virtualScrollScore.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={virtualScrollScore} className="h-2" />
              <p className="text-xs text-gray-600">
                Virtualization efficiency
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

ReactPerformance.displayName = 'ReactPerformance';

/**
 * Network Performance Component
 */
const NetworkPerformance = memo<{ metrics: FrontendPerformanceMetrics }>(({ metrics }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Wifi className="h-4 w-4" />
          <span>Network Latency</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceStatus 
          value={metrics.networkLatency} 
          thresholds={PERFORMANCE_THRESHOLDS.networkLatency}
          invert
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Database className="h-4 w-4" />
          <span>Cache Hit Ratio</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceStatus 
          value={metrics.cacheHitRatio * 100} 
          thresholds={{ good: 80, needsImprovement: 50 }}
          unit="%"
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>Bundle Load Time</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceStatus 
          value={metrics.bundleLoadTime} 
          thresholds={{ good: 1000, needsImprovement: 3000 }}
          invert
        />
      </CardContent>
    </Card>

    {metrics.webSocketLatency && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>WebSocket Latency</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceStatus 
            value={metrics.webSocketLatency} 
            thresholds={{ good: 50, needsImprovement: 150 }}
            invert
          />
        </CardContent>
      </Card>
    )}
  </div>
));

NetworkPerformance.displayName = 'NetworkPerformance';

/**
 * Accessibility Performance Component
 */
const AccessibilityPerformance = memo<{ metrics: FrontendPerformanceMetrics }>(({ metrics }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span>Accessibility Score</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <PerformanceStatus 
            value={metrics.accessibilityScore} 
            thresholds={PERFORMANCE_THRESHOLDS.accessibility}
            unit="/100"
          />
          <Progress value={metrics.accessibilityScore} className="h-2" />
          <p className="text-xs text-gray-600">
            WCAG 2.1 AA compliance
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Activity className="h-4 w-4" />
          <span>Keyboard Navigation</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PerformanceStatus 
          value={metrics.keyboardNavigationDelay} 
          thresholds={{ good: 100, needsImprovement: 300 }}
          invert
        />
        <p className="text-xs text-gray-600 mt-2">
          Tab navigation responsiveness
        </p>
      </CardContent>
    </Card>
  </div>
));

AccessibilityPerformance.displayName = 'AccessibilityPerformance';

/**
 * Main Frontend Performance Monitor Component
 */
export interface FrontendPerformanceMonitorProps {
  metrics: FrontendPerformanceMetrics;
  onRefresh?: () => void;
  realTimeMode?: boolean;
  className?: string;
}

export const FrontendPerformanceMonitor: React.FC<FrontendPerformanceMonitorProps> = ({
  metrics,
  onRefresh,
  realTimeMode = false,
  className
}) => {
  const [activeTab, setActiveTab] = useState('core-vitals');
  const [autoRefresh, setAutoRefresh] = useState(realTimeMode);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;

    const interval = setInterval(onRefresh, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  // Calculate overall performance score
  const calculateOverallScore = useCallback(() => {
    const scores = [
      // Core Web Vitals (40% weight)
      metrics.largestContentfulPaint <= 2500 ? 100 : 
        Math.max(0, 100 - (metrics.largestContentfulPaint - 2500) / 50),
      metrics.firstInputDelay <= 100 ? 100 : 
        Math.max(0, 100 - (metrics.firstInputDelay - 100) / 5),
      metrics.cumulativeLayoutShift <= 0.1 ? 100 : 
        Math.max(0, 100 - (metrics.cumulativeLayoutShift - 0.1) * 200),
      
      // React Performance (30% weight)
      metrics.componentRenderTime <= 16 ? 100 : 
        Math.max(0, 100 - (metrics.componentRenderTime - 16) * 2),
      metrics.memoryUsage <= 100 ? 100 : 
        Math.max(0, 100 - (metrics.memoryUsage - 100) / 2),
      metrics.virtualScrollPerformance,
      
      // Network Performance (20% weight)
      metrics.networkLatency <= 100 ? 100 : 
        Math.max(0, 100 - (metrics.networkLatency - 100) / 5),
      metrics.cacheHitRatio * 100,
      
      // Accessibility (10% weight)
      metrics.accessibilityScore
    ];

    const weights = [0.15, 0.15, 0.1, 0.15, 0.1, 0.05, 0.1, 0.1, 0.1];
    return scores.reduce((sum, score, index) => sum + (score * weights[index]), 0);
  }, [metrics]);

  const overallScore = calculateOverallScore();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Frontend Performance Monitor</span>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Real-time frontend performance metrics and optimization insights
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant={overallScore >= 90 ? "default" : overallScore >= 70 ? "secondary" : "destructive"}
              className="text-sm"
            >
              Score: {overallScore.toFixed(0)}/100
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-50 border-green-200" : ""}
            >
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={!onRefresh}
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="core-vitals">Core Web Vitals</TabsTrigger>
            <TabsTrigger value="react-performance">React Performance</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          </TabsList>

          <TabsContent value="core-vitals" className="mt-6">
            <CoreWebVitals metrics={metrics} />
          </TabsContent>

          <TabsContent value="react-performance" className="mt-6">
            <ReactPerformance metrics={metrics} />
          </TabsContent>

          <TabsContent value="network" className="mt-6">
            <NetworkPerformance metrics={metrics} />
          </TabsContent>

          <TabsContent value="accessibility" className="mt-6">
            <AccessibilityPerformance metrics={metrics} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FrontendPerformanceMonitor;