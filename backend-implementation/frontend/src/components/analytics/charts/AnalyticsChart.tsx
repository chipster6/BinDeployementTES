'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Download,
  Maximize2,
  Settings
} from 'lucide-react';

interface ChartData {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

interface ChartProps {
  title: string;
  description?: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'gauge' | 'heatmap';
  data: ChartData[];
  height?: number;
  showTrend?: boolean;
  trendValue?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  error?: string;
  interactive?: boolean;
  showExport?: boolean;
  showFullscreen?: boolean;
  showSettings?: boolean;
  className?: string;
  colors?: string[];
  onDataPointClick?: (data: ChartData) => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  onSettings?: () => void;
}

export default function AnalyticsChart({
  title,
  description,
  type,
  data,
  height = 300,
  showTrend = false,
  trendValue,
  trendDirection = 'neutral',
  loading = false,
  error,
  interactive = true,
  showExport = true,
  showFullscreen = true,
  showSettings = false,
  className = '',
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  onDataPointClick,
  onExport,
  onFullscreen,
  onSettings
}: ChartProps) {

  const getChartIcon = () => {
    switch (type) {
      case 'line': return <LineChart className="h-5 w-5" />;
      case 'bar': return <BarChart3 className="h-5 w-5" />;
      case 'pie': return <PieChart className="h-5 w-5" />;
      case 'area': return <LineChart className="h-5 w-5" />;
      case 'gauge': return <BarChart3 className="h-5 w-5" />;
      case 'heatmap': return <BarChart3 className="h-5 w-5" />;
      default: return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getTrendColor = () => {
    switch (trendDirection) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center text-red-600">
            <p className="text-sm font-medium">Error loading chart</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center text-gray-500">
            <p className="text-sm font-medium">No data available</p>
            <p className="text-xs">Chart will update when data is available</p>
          </div>
        </div>
      );
    }

    // Chart placeholder with visual representation
    return (
      <div 
        className="relative flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-200" 
        style={{ height }}
      >
        <div className="text-center space-y-4">
          <div className="text-gray-400">
            {getChartIcon()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 capitalize">{type} Chart</p>
            <p className="text-xs text-gray-600">Recharts/D3.js integration placeholder</p>
          </div>
          
          {/* Data Points Preview */}
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            {data.slice(0, 4).map((item, index) => (
              <div 
                key={index}
                className={`p-2 bg-white/80 rounded border text-xs ${
                  interactive ? 'cursor-pointer hover:bg-white transition-colors' : ''
                }`}
                onClick={() => interactive && onDataPointClick?.(item)}
              >
                <div className="font-medium text-gray-800 truncate">{item.label}</div>
                <div className="text-blue-600 font-bold">
                  {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                </div>
              </div>
            ))}
          </div>

          {data.length > 4 && (
            <p className="text-xs text-gray-500">
              +{data.length - 4} more data points
            </p>
          )}
        </div>

        {/* Interactive overlay for development */}
        {interactive && (
          <div className="absolute inset-0 bg-blue-500/5 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-blue-700">
              Interactive Chart Ready
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center space-x-2">
            {getChartIcon()}
            <span>{title}</span>
          </CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {showTrend && trendValue !== undefined && (
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {trendDirection === 'up' ? '+' : trendDirection === 'down' ? '-' : ''}
                {Math.abs(trendValue).toFixed(1)}%
              </span>
            </div>
          )}
          
          {loading && (
            <Badge variant="outline" className="text-xs">
              Loading...
            </Badge>
          )}
          
          {error && (
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          )}
          
          <div className="flex items-center space-x-1">
            {showSettings && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onSettings}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            
            {showExport && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onExport}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            {showFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {renderChart()}
        
        {/* Chart Statistics */}
        {data && data.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Data Points:</span>
              <span className="ml-1">{data.length}</span>
            </div>
            <div>
              <span className="font-medium">Max Value:</span>
              <span className="ml-1">{Math.max(...data.map(d => d.value)).toLocaleString()}</span>
            </div>
            <div>
              <span className="font-medium">Min Value:</span>
              <span className="ml-1">{Math.min(...data.map(d => d.value)).toLocaleString()}</span>
            </div>
            <div>
              <span className="font-medium">Average:</span>
              <span className="ml-1">
                {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}