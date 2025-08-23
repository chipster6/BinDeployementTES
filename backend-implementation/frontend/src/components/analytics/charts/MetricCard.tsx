'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  description?: string;
  value: number | string;
  unit?: string;
  previousValue?: number;
  target?: number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    label?: string;
  };
  status?: 'excellent' | 'good' | 'warning' | 'critical' | 'neutral';
  progress?: {
    current: number;
    max: number;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
  onClick?: () => void;
  loading?: boolean;
  error?: string;
}

export default function MetricCard({
  title,
  description,
  value,
  unit,
  previousValue,
  target,
  trend,
  status = 'neutral',
  progress,
  icon,
  variant = 'default',
  className = '',
  onClick,
  loading = false,
  error
}: MetricCardProps) {

  const getStatusColor = () => {
    switch (status) {
      case 'excellent': return 'from-green-50 to-emerald-50 border-green-200';
      case 'good': return 'from-blue-50 to-cyan-50 border-blue-200';
      case 'warning': return 'from-yellow-50 to-amber-50 border-yellow-200';
      case 'critical': return 'from-red-50 to-rose-50 border-red-200';
      default: return 'from-gray-50 to-slate-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-600';
    switch (trend.direction) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    // Format large numbers
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    } else if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}K`;
    }
    
    return val.toLocaleString();
  };

  const calculateProgress = () => {
    if (progress) {
      return (progress.current / progress.max) * 100;
    }
    if (target && typeof value === 'number') {
      return (value / target) * 100;
    }
    return 0;
  };

  if (loading) {
    return (
      <Card className={`bg-gradient-to-br ${getStatusColor()} ${className} animate-pulse`}>
        <CardHeader className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-gradient-to-br from-red-50 to-rose-50 border-red-200 ${className}`}>
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card 
        className={`bg-gradient-to-br ${getStatusColor()} ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">{title}</p>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-gray-900">
                  {formatValue(value)}
                </span>
                {unit && <span className="text-sm text-gray-600">{unit}</span>}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {icon}
              {getStatusIcon()}
            </div>
          </div>
          
          {trend && (
            <div className="flex items-center space-x-1 mt-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                {Math.abs(trend.value).toFixed(1)}%
                {trend.label && <span className="text-gray-600 ml-1">{trend.label}</span>}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card 
        className={`bg-gradient-to-br ${getStatusColor()} ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-sm font-medium text-gray-800">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {icon}
            {getStatusIcon()}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Main Value */}
          <div className="space-y-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-gray-900">
                {formatValue(value)}
              </span>
              {unit && <span className="text-lg text-gray-600">{unit}</span>}
            </div>
            
            {/* Comparison with previous value */}
            {previousValue !== undefined && typeof value === 'number' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">vs previous:</span>
                <span className={`text-sm font-medium ${
                  value > previousValue ? 'text-green-600' : value < previousValue ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {value > previousValue ? '+' : ''}
                  {((value - previousValue) / previousValue * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Trend Information */}
          {trend && (
            <div className="flex items-center space-x-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                {Math.abs(trend.value).toFixed(1)}%
                {trend.label && <span className="text-gray-600 ml-1">{trend.label}</span>}
              </span>
            </div>
          )}

          {/* Progress Bar */}
          {(progress || target) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {progress?.label || 'Progress to target'}
                </span>
                <span className="font-medium">
                  {calculateProgress().toFixed(1)}%
                </span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
              {target && typeof value === 'number' && (
                <div className="text-xs text-gray-600">
                  Target: {formatValue(target)}{unit}
                </div>
              )}
            </div>
          )}

          {/* Status Badge */}
          {status !== 'neutral' && (
            <div className="flex justify-end">
              <Badge 
                className={`text-xs ${
                  status === 'excellent' ? 'bg-green-100 text-green-800' :
                  status === 'good' ? 'bg-blue-100 text-blue-800' :
                  status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card 
      className={`bg-gradient-to-br ${getStatusColor()} ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-gray-800">{title}</CardTitle>
        <div className="flex items-center space-x-1">
          {icon}
          {getStatusIcon()}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {formatValue(value)}
          {unit && <span className="text-lg font-normal text-gray-600 ml-1">{unit}</span>}
        </div>
        
        <div className="space-y-2">
          {trend && (
            <div className="flex items-center space-x-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                {Math.abs(trend.value).toFixed(1)}%
                {trend.label && <span className="text-gray-600 ml-1">{trend.label}</span>}
              </span>
            </div>
          )}
          
          {(progress || target) && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">
                  {progress?.label || 'Target Progress'}
                </span>
                <span className="font-medium">
                  {calculateProgress().toFixed(1)}%
                </span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
              {target && typeof value === 'number' && (
                <div className="text-xs text-gray-600">
                  Target: {formatValue(target)}{unit}
                </div>
              )}
            </div>
          )}
          
          {description && (
            <p className="text-xs text-gray-600">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}