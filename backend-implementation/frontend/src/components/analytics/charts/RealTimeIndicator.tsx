'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Zap, 
  Clock,
  Users,
  Truck,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Pause,
  Play
} from 'lucide-react';

interface RealTimeData {
  timestamp: Date;
  value: number | string;
  status: 'normal' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

interface RealTimeIndicatorProps {
  title: string;
  description?: string;
  type: 'counter' | 'status' | 'gauge' | 'list' | 'alert';
  initialValue?: number | string;
  unit?: string;
  refreshInterval?: number; // milliseconds
  maxDataPoints?: number;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
  icon?: React.ReactNode;
  colorScheme?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  showHistory?: boolean;
  onDataUpdate?: (data: RealTimeData) => void;
  onStatusChange?: (status: 'normal' | 'warning' | 'critical') => void;
  className?: string;
  autoStart?: boolean;
}

export default function RealTimeIndicator({
  title,
  description,
  type,
  initialValue = 0,
  unit,
  refreshInterval = 5000,
  maxDataPoints = 20,
  thresholds,
  icon,
  colorScheme = 'blue',
  showHistory = false,
  onDataUpdate,
  onStatusChange,
  className = '',
  autoStart = true
}: RealTimeIndicatorProps) {

  const [isLive, setIsLive] = useState(autoStart);
  const [currentValue, setCurrentValue] = useState<number | string>(initialValue);
  const [status, setStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [history, setHistory] = useState<RealTimeData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');

  // Simulate real-time data updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Simulate data fetching
      setConnectionStatus('connecting');
      
      setTimeout(() => {
        // Generate mock real-time data
        const newValue = generateMockData();
        const newStatus = determineStatus(newValue);
        const newData: RealTimeData = {
          timestamp: new Date(),
          value: newValue,
          status: newStatus,
          metadata: {
            source: 'realtime-api',
            confidence: Math.random() * 0.3 + 0.7 // 70-100%
          }
        };

        setCurrentValue(newValue);
        setStatus(newStatus);
        setLastUpdated(new Date());
        setConnectionStatus('connected');

        // Update history
        setHistory(prev => {
          const updated = [...prev, newData];
          return updated.slice(-maxDataPoints);
        });

        // Callbacks
        onDataUpdate?.(newData);
        if (newStatus !== status) {
          onStatusChange?.(newStatus);
        }
      }, 200);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isLive, refreshInterval, maxDataPoints, status, onDataUpdate, onStatusChange]);

  const generateMockData = (): number | string => {
    switch (type) {
      case 'counter':
        return typeof currentValue === 'number' 
          ? currentValue + Math.floor(Math.random() * 5) 
          : Math.floor(Math.random() * 100);
      case 'gauge':
        return Math.random() * 100;
      case 'status':
        const statuses = ['Operational', 'Warning', 'Maintenance', 'Critical'];
        return statuses[Math.floor(Math.random() * statuses.length)];
      case 'list':
        return Math.floor(Math.random() * 50);
      case 'alert':
        return Math.floor(Math.random() * 10);
      default:
        return Math.floor(Math.random() * 100);
    }
  };

  const determineStatus = (value: number | string): 'normal' | 'warning' | 'critical' => {
    if (typeof value !== 'number' || !thresholds) return 'normal';
    
    if (thresholds.critical && value >= thresholds.critical) return 'critical';
    if (thresholds.warning && value >= thresholds.warning) return 'warning';
    return 'normal';
  };

  const getColorClasses = () => {
    const baseClass = {
      blue: 'from-blue-50 to-cyan-50 border-blue-200',
      green: 'from-green-50 to-emerald-50 border-green-200',
      orange: 'from-orange-50 to-amber-50 border-orange-200',
      red: 'from-red-50 to-rose-50 border-red-200',
      purple: 'from-purple-50 to-violet-50 border-purple-200'
    }[colorScheme];

    if (status === 'critical') return 'from-red-50 to-rose-50 border-red-300';
    if (status === 'warning') return 'from-yellow-50 to-amber-50 border-yellow-300';
    return baseClass;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600 animate-pulse" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="h-4 w-4 text-green-600" />;
      case 'connecting': return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
      default: return <WifiOff className="h-4 w-4 text-red-600" />;
    }
  };

  const formatValue = (value: number | string) => {
    if (typeof value === 'string') return value;
    return value.toLocaleString();
  };

  return (
    <Card className={`bg-gradient-to-br ${getColorClasses()} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center space-x-2 text-sm font-medium">
            {icon}
            <span>{title}</span>
          </CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Live Status Indicator */}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs text-gray-600">
              {isLive ? 'Live' : 'Paused'}
            </span>
          </div>
          
          {/* Connection Status */}
          {getConnectionIcon()}
          
          {/* Status Indicator */}
          {getStatusIcon()}
          
          {/* Control Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Value Display */}
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatValue(currentValue)}
            </span>
            {unit && <span className="text-lg text-gray-600">{unit}</span>}
          </div>
          
          {/* Type-specific additional info */}
          {type === 'gauge' && typeof currentValue === 'number' && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  status === 'critical' ? 'bg-red-500' :
                  status === 'warning' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, currentValue))}%` }}
              />
            </div>
          )}
        </div>

        {/* Status Information */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          
          <Badge 
            className={`text-xs ${
              status === 'critical' ? 'bg-red-100 text-red-800' :
              status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>

        {/* Thresholds Display */}
        {thresholds && (type === 'counter' || type === 'gauge') && (
          <div className="space-y-1 text-xs text-gray-600">
            {thresholds.warning && (
              <div className="flex justify-between">
                <span>Warning threshold:</span>
                <span className="font-medium">{thresholds.warning}{unit}</span>
              </div>
            )}
            {thresholds.critical && (
              <div className="flex justify-between">
                <span>Critical threshold:</span>
                <span className="font-medium">{thresholds.critical}{unit}</span>
              </div>
            )}
          </div>
        )}

        {/* History Display */}
        {showHistory && history.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Recent Activity</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {history.slice(-5).reverse().map((data, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {data.timestamp.toLocaleTimeString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {formatValue(data.value)}{unit}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      data.status === 'critical' ? 'bg-red-500' :
                      data.status === 'warning' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <span className="font-medium">Data Points:</span>
            <span className="ml-1">{history.length}</span>
          </div>
          <div>
            <span className="font-medium">Update Rate:</span>
            <span className="ml-1">{refreshInterval / 1000}s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}