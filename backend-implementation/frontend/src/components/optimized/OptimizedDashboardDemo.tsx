"use client";

/**
 * ============================================================================
 * OPTIMIZED DASHBOARD DEMO COMPONENT
 * ============================================================================
 *
 * Comprehensive demo showcasing advanced frontend performance optimization
 * with React virtualization, lazy loading, and real-time coordination.
 *
 * Features:
 * - Enhanced virtualized grid with 10,000+ items
 * - Intelligent lazy loading with caching
 * - Real-time performance monitoring
 * - Backend coordination examples
 * - Accessibility compliance demonstration
 * - Memory usage optimization
 *
 * Coordination Demonstration:
 * - Performance Specialist: Live backend metrics integration
 * - Database Architect: Optimized data fetching patterns
 * - Innovation Architect: AI-powered preloading predictions
 * - External API: Real-time data streaming
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  TrendingUp,
  Database,
  Wifi,
  Cpu,
  Users,
  Package,
  MapPin,
  Calendar
} from 'lucide-react';

import EnhancedVirtualizedGrid, { GridConfig, GridItem } from './EnhancedVirtualizedGrid';
import FrontendPerformanceMonitor, { FrontendPerformanceMetrics } from './FrontendPerformanceMonitor';
import { useEnhancedLazyLoading } from '@/hooks/useEnhancedLazyLoading';
import { useOptimizedPagination } from '@/hooks/useOptimizedPagination';
import { usePerformanceCoordination } from '@/hooks/usePerformanceCoordination';

/**
 * Mock Data Interfaces
 */
interface BinItem extends GridItem {
  id: string;
  location: string;
  fillLevel: number;
  lastCollected: string;
  status: 'active' | 'maintenance' | 'full' | 'error';
  temperature: number;
  batteryLevel: number;
  coordinates: [number, number];
}

interface CustomerItem extends GridItem {
  id: string;
  name: string;
  address: string;
  serviceLevel: 'basic' | 'premium' | 'enterprise';
  monthlyRevenue: number;
  lastService: string;
  satisfaction: number;
}

/**
 * Mock Data Generators
 */
const generateBinData = (count: number): BinItem[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `bin-${index + 1}`,
    location: `Location ${index + 1}`,
    fillLevel: Math.random() * 100,
    lastCollected: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: ['active', 'maintenance', 'full', 'error'][Math.floor(Math.random() * 4)] as any,
    temperature: 15 + Math.random() * 20,
    batteryLevel: Math.random() * 100,
    coordinates: [
      40.7128 + (Math.random() - 0.5) * 0.1,
      -74.0060 + (Math.random() - 0.5) * 0.1
    ]
  }));
};

const generateCustomerData = (count: number): CustomerItem[] => {
  const companies = ['TechCorp', 'GreenSolutions', 'UrbanServices', 'EcoFriendly', 'CleanCity'];
  const servicelevels = ['basic', 'premium', 'enterprise'] as const;
  
  return Array.from({ length: count }, (_, index) => ({
    id: `customer-${index + 1}`,
    name: `${companies[index % companies.length]} ${index + 1}`,
    address: `${100 + index} Main Street, City ${index % 50 + 1}`,
    serviceLevel: servicelevels[index % 3],
    monthlyRevenue: 500 + Math.random() * 9500,
    lastService: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    satisfaction: 1 + Math.random() * 4
  }));
};

/**
 * Mock Performance Metrics Generator
 */
const generateMockMetrics = (): FrontendPerformanceMetrics => ({
  largestContentfulPaint: 1800 + Math.random() * 1000,
  firstInputDelay: 50 + Math.random() * 100,
  cumulativeLayoutShift: Math.random() * 0.2,
  firstContentfulPaint: 1200 + Math.random() * 600,
  timeToInteractive: 3000 + Math.random() * 2000,
  componentRenderTime: 10 + Math.random() * 20,
  virtualScrollPerformance: 85 + Math.random() * 15,
  memoryUsage: 80 + Math.random() * 100,
  networkLatency: 50 + Math.random() * 150,
  cacheHitRatio: 0.7 + Math.random() * 0.3,
  bundleLoadTime: 800 + Math.random() * 1200,
  webSocketLatency: 30 + Math.random() * 70,
  realTimeUpdateRate: 10 + Math.random() * 20,
  accessibilityScore: 85 + Math.random() * 15,
  keyboardNavigationDelay: 50 + Math.random() * 100
});

/**
 * Grid Item Renderers
 */
const BinItemRenderer = ({ item, index, isVisible }: { item: BinItem; index: number; isVisible: boolean }) => {
  const statusColors = {
    active: 'bg-green-100 border-green-300 text-green-800',
    maintenance: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    full: 'bg-red-100 border-red-300 text-red-800',
    error: 'bg-gray-100 border-gray-300 text-gray-800'
  };

  return (
    <Card className={`h-full transition-all duration-200 hover:shadow-lg ${statusColors[item.status]}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Package className="h-4 w-4" />
          <span>{item.location}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs">Fill Level:</span>
          <Badge variant="outline">{item.fillLevel.toFixed(0)}%</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs">Battery:</span>
          <Badge variant="outline">{item.batteryLevel.toFixed(0)}%</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs">Status:</span>
          <Badge className="text-xs">{item.status}</Badge>
        </div>
        <div className="text-xs text-gray-600">
          Last: {new Date(item.lastCollected).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};

const CustomerItemRenderer = ({ item, index, isVisible }: { item: CustomerItem; index: number; isVisible: boolean }) => {
  const serviceColors = {
    basic: 'border-gray-300',
    premium: 'border-blue-300',
    enterprise: 'border-purple-300'
  };

  return (
    <Card className={`h-full transition-all duration-200 hover:shadow-lg border-2 ${serviceColors[item.serviceLevel]}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>{item.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-gray-600">{item.address}</div>
        <div className="flex justify-between items-center">
          <span className="text-xs">Service:</span>
          <Badge variant={item.serviceLevel === 'enterprise' ? 'default' : 'outline'}>
            {item.serviceLevel}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs">Revenue:</span>
          <Badge variant="outline">${item.monthlyRevenue.toFixed(0)}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs">Satisfaction:</span>
          <Badge variant="outline">{item.satisfaction.toFixed(1)}/5</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Main Optimized Dashboard Demo Component
 */
export const OptimizedDashboardDemo: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState('bins');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<FrontendPerformanceMetrics>(generateMockMetrics());
  const [dataSize, setDataSize] = useState(5000);
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    itemSize: { width: 280, height: 200 },
    columns: 4,
    gap: 16,
    overscan: 5,
    enableDynamicSizing: true,
    enableInfiniteScroll: true,
    enableRealTimeUpdates: true,
    preloadThreshold: 0.8,
    memoryLimit: 1000
  });

  // Data generation
  const binData = useMemo(() => generateBinData(dataSize), [dataSize]);
  const customerData = useMemo(() => generateCustomerData(dataSize), [dataSize]);

  // Performance tracking refs
  const performanceUpdateRef = useRef<NodeJS.Timeout>();

  // Performance coordination with backend (coordinated with Performance Specialist)
  const {
    backendMetrics,
    recommendations,
    correlation,
    updateFrontendMetrics,
    executeOptimization,
    isCoordinated,
    getPerformanceGrade,
    getCriticalIssues
  } = usePerformanceCoordination({
    enableRealTimeSync: isRealTimeEnabled,
    metricsUpdateInterval: 3000,
    autoOptimization: false,
    debugMode: false
  });

  // Mock real-time data updates
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      // Simulate real-time metrics updates
      setPerformanceMetrics(generateMockMetrics());
    }, 2000);

    return () => clearInterval(interval);
  }, [isRealTimeEnabled]);

  // Performance metrics update handler
  const handlePerformanceUpdate = useCallback((metrics: any) => {
    // Debounce performance updates
    if (performanceUpdateRef.current) {
      clearTimeout(performanceUpdateRef.current);
    }

    performanceUpdateRef.current = setTimeout(() => {
      const updatedMetrics = {
        ...performanceMetrics,
        virtualScrollPerformance: metrics.virtualizedRatio * 100,
        componentRenderTime: metrics.renderTime,
        memoryUsage: performanceMetrics.memoryUsage + (metrics.memoryUsage - performanceMetrics.memoryUsage) * 0.1
      };
      
      setPerformanceMetrics(updatedMetrics);
      
      // Update coordination with backend Performance Specialist
      updateFrontendMetrics({
        componentRenderTime: updatedMetrics.componentRenderTime,
        virtualScrollPerformance: updatedMetrics.virtualScrollPerformance,
        memoryUsage: updatedMetrics.memoryUsage,
        cacheHitRatio: updatedMetrics.cacheHitRatio
      });
    }, 100);
  }, [performanceMetrics, updateFrontendMetrics]);

  // Configuration handlers
  const handleDataSizeChange = useCallback((newSize: number) => {
    setDataSize(newSize);
  }, []);

  const handleConfigChange = useCallback((key: keyof GridConfig, value: any) => {
    setGridConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const refreshMetrics = useCallback(() => {
    setPerformanceMetrics(generateMockMetrics());
  }, []);

  // Grid item click handlers
  const handleBinClick = useCallback((item: BinItem, index: number) => {
    console.log('Bin clicked:', item.id, 'at index:', index);
    // In real app: navigate to bin details or open modal
  }, []);

  const handleCustomerClick = useCallback((item: CustomerItem, index: number) => {
    console.log('Customer clicked:', item.id, 'at index:', index);
    // In real app: navigate to customer details or open modal
  }, []);

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Frontend Performance Optimization Demo</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Showcasing React virtualization, lazy loading, and real-time coordination
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Coordination Status Indicators */}
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={isCoordinated ? "default" : "destructive"}
                  className="text-xs"
                >
                  {isCoordinated ? "Coordinated" : "Not Synced"}
                </Badge>
                <Badge 
                  variant={getPerformanceGrade() === 'A+' || getPerformanceGrade() === 'A' ? "default" : 
                          getPerformanceGrade() === 'B+' || getPerformanceGrade() === 'B' ? "secondary" : "destructive"}
                  className="text-xs"
                >
                  Grade: {getPerformanceGrade()}
                </Badge>
                {getCriticalIssues() > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {getCriticalIssues()} Critical
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <label htmlFor="realtime-toggle" className="text-sm">Real-time Updates</label>
                <Switch
                  id="realtime-toggle"
                  checked={isRealTimeEnabled}
                  onCheckedChange={setIsRealTimeEnabled}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm">Data Size:</span>
                <Button
                  variant={dataSize === 1000 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDataSizeChange(1000)}
                >
                  1K
                </Button>
                <Button
                  variant={dataSize === 5000 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDataSizeChange(5000)}
                >
                  5K
                </Button>
                <Button
                  variant={dataSize === 10000 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDataSizeChange(10000)}
                >
                  10K
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Performance Monitor */}
      <FrontendPerformanceMonitor
        metrics={performanceMetrics}
        onRefresh={refreshMetrics}
        realTimeMode={isRealTimeEnabled}
      />

      {/* Data Visualization Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bins" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Bins ({binData.length.toLocaleString()})</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Customers ({customerData.length.toLocaleString()})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bins" className="mt-6">
          <EnhancedVirtualizedGrid
            data={binData}
            config={gridConfig}
            renderItem={BinItemRenderer}
            onItemClick={handleBinClick}
            onPerformanceUpdate={handlePerformanceUpdate}
            title="Waste Management Bins"
            subtitle={`Virtualized grid showing ${binData.length.toLocaleString()} bins with real-time status updates`}
            searchable
            realTimeEndpoint={isRealTimeEnabled ? "/ws/bins" : undefined}
            accessibilityLabel="Waste management bins grid"
            itemTestId={(item) => `bin-${item.id}`}
          />
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          <EnhancedVirtualizedGrid
            data={customerData}
            config={{
              ...gridConfig,
              itemSize: { width: 300, height: 180 }
            }}
            renderItem={CustomerItemRenderer}
            onItemClick={handleCustomerClick}
            onPerformanceUpdate={handlePerformanceUpdate}
            title="Customer Management"
            subtitle={`Virtualized grid showing ${customerData.length.toLocaleString()} customers with service details`}
            searchable
            realTimeEndpoint={isRealTimeEnabled ? "/ws/customers" : undefined}
            accessibilityLabel="Customer management grid"
            itemTestId={(item) => `customer-${item.id}`}
          />
        </TabsContent>
      </Tabs>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Optimization Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Columns</label>
              <div className="flex space-x-1">
                {[2, 3, 4, 5, 6].map(cols => (
                  <Button
                    key={cols}
                    variant={gridConfig.columns === cols ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleConfigChange('columns', cols)}
                  >
                    {cols}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Overscan</label>
              <div className="flex space-x-1">
                {[3, 5, 10, 15].map(overscan => (
                  <Button
                    key={overscan}
                    variant={gridConfig.overscan === overscan ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleConfigChange('overscan', overscan)}
                  >
                    {overscan}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={gridConfig.enableInfiniteScroll}
                onCheckedChange={(checked) => handleConfigChange('enableInfiniteScroll', checked)}
              />
              <label className="text-sm">Infinite Scroll</label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={gridConfig.enableDynamicSizing}
                onCheckedChange={(checked) => handleConfigChange('enableDynamicSizing', checked)}
              />
              <label className="text-sm">Dynamic Sizing</label>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span>Database Architect: Optimized pagination with caching</span>
              </div>
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-green-600" />
                <span>Performance Specialist: Real-time metrics integration</span>
              </div>
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-purple-600" />
                <span>External API: WebSocket optimization</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations Panel */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Performance Optimization Recommendations</span>
              <Badge variant="secondary">{recommendations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    rec.priority === 'critical' ? 'border-red-300 bg-red-50' :
                    rec.priority === 'high' ? 'border-orange-300 bg-orange-50' :
                    'border-blue-300 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={rec.priority === 'critical' ? 'destructive' : 
                                rec.priority === 'high' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {rec.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rec.category}
                      </Badge>
                      {rec.coordinationRequired && (
                        <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                          Coordination Required
                        </Badge>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => executeOptimization(rec)}
                      disabled={rec.implementationEffort === 'high' || rec.coordinationRequired}
                    >
                      {rec.implementationEffort === 'low' ? 'Apply' : 'Manual'}
                    </Button>
                  </div>
                  <h4 className="font-medium text-sm mb-1">{rec.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">{rec.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Impact: {rec.estimatedImprovement}</span>
                    <span>Effort: {rec.implementationEffort}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OptimizedDashboardDemo;