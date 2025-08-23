// Analytics Charts Library
// Advanced visualization components for waste management analytics

export { default as AnalyticsChart } from './AnalyticsChart';
export { default as MetricCard } from './MetricCard';
export { default as RealTimeIndicator } from './RealTimeIndicator';

// Type exports for component props
export type { default as AnalyticsChartProps } from './AnalyticsChart';
export type { default as MetricCardProps } from './MetricCard';
export type { default as RealTimeIndicatorProps } from './RealTimeIndicator';

// Common chart data interfaces
export interface ChartDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  category?: string;
}

export interface GeospatialData {
  lat: number;
  lng: number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface MetricThresholds {
  warning?: number;
  critical?: number;
  target?: number;
}

export interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  value: number;
  period: string;
}

// Chart configuration interfaces
export interface ChartConfig {
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  interactive?: boolean;
  responsive?: boolean;
}

export interface RealTimeConfig {
  refreshInterval: number;
  maxDataPoints: number;
  autoStart: boolean;
  thresholds?: MetricThresholds;
}

// Analytics dashboard data types
export interface DashboardMetric {
  id: string;
  title: string;
  value: number | string;
  unit?: string;
  trend?: TrendData;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  target?: number;
  description?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'realtime';
  title: string;
  size: 'small' | 'medium' | 'large' | 'fullwidth';
  config: Record<string, any>;
  data: any;
  refreshRate?: number;
}

// Utility functions for chart data processing
export const processChartData = (rawData: any[]): ChartDataPoint[] => {
  return rawData.map(item => ({
    label: item.label || item.name || 'Unknown',
    value: Number(item.value) || 0,
    metadata: item.metadata || {}
  }));
};

export const calculateTrend = (current: number, previous: number): TrendData => {
  const change = ((current - previous) / previous) * 100;
  return {
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    value: Math.abs(change),
    period: 'vs previous'
  };
};

export const formatMetricValue = (value: number, unit?: string): string => {
  let formatted: string;
  
  if (value >= 1000000) {
    formatted = `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    formatted = `${(value / 1000).toFixed(1)}K`;
  } else {
    formatted = value.toLocaleString();
  }
  
  return unit ? `${formatted} ${unit}` : formatted;
};

export const getStatusFromValue = (
  value: number, 
  thresholds: MetricThresholds
): 'excellent' | 'good' | 'warning' | 'critical' => {
  if (thresholds.critical && value >= thresholds.critical) return 'critical';
  if (thresholds.warning && value >= thresholds.warning) return 'warning';
  if (thresholds.target && value >= thresholds.target) return 'excellent';
  return 'good';
};

// Color schemes for different chart types
export const chartColorSchemes = {
  default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  revenue: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  costs: ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  performance: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe'],
  status: ['#10b981', '#f59e0b', '#ef4444', '#6b7280'],
  gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe']
};

// Dashboard layout utilities
export const getWidgetSize = (size: 'small' | 'medium' | 'large' | 'fullwidth') => {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'medium': return 'col-span-2';
    case 'large': return 'col-span-3';
    case 'fullwidth': return 'col-span-full';
    default: return 'col-span-2';
  }
};

export const generateWidgetId = (prefix: string = 'widget'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};