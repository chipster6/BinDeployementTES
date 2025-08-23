'use client';

/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - FALLBACK COMPONENTS
 * ============================================================================
 * 
 * Comprehensive collection of fallback UI components for graceful degradation
 * during errors, network issues, or service unavailability. Provides user-
 * friendly alternatives that maintain essential functionality and clear 
 * communication about system status.
 *
 * Features:
 * - Offline mode detection and handling
 * - Progressive web app functionality
 * - Cached data display during outages
 * - Skeleton loading states
 * - Service unavailable indicators
 * - Emergency contact information
 * - Retry mechanisms with exponential backoff
 *
 * Created by: Error Resilience Guardian  
 * Date: 2025-08-23
 * Version: 1.0.0
 */

import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Phone,
  Mail,
  MapPin,
  Clock,
  Truck,
  Calendar,
  User,
  Database,
  Server,
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Zap
} from 'lucide-react';

// Types for fallback components
export interface OfflineData {
  lastUpdated: Date;
  cachedRoutes?: any[];
  cachedCustomers?: any[];
  cachedBins?: any[];
  emergencyContacts?: EmergencyContact[];
}

export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  email: string;
  available24h: boolean;
}

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  lastCheck: Date;
  responseTime?: number;
  message?: string;
}

// Hook for offline detection and data management
export function useOfflineMode() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null);
  const [lastOnline, setLastOnline] = useState<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setLastOnline(new Date());
      // Sync offline data when back online
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOffline(true);
      // Cache current data for offline use
      cacheCurrentData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load of cached data
    loadOfflineData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheCurrentData = useCallback(() => {
    try {
      const data: OfflineData = {
        lastUpdated: new Date(),
        emergencyContacts: [
          {
            name: "Emergency Dispatch",
            role: "24/7 Operations",
            phone: "+1-800-WASTE-911",
            email: "emergency@wastemanagement.com",
            available24h: true
          },
          {
            name: "Customer Service",
            role: "General Support",
            phone: "+1-800-WASTE-HELP",
            email: "support@wastemanagement.com",
            available24h: false
          }
        ]
      };
      
      localStorage.setItem('offline_data', JSON.stringify(data));
      setOfflineData(data);
    } catch (error) {
      console.warn('Failed to cache offline data:', error);
    }
  }, []);

  const loadOfflineData = useCallback(() => {
    try {
      const cached = localStorage.getItem('offline_data');
      if (cached) {
        const data = JSON.parse(cached);
        data.lastUpdated = new Date(data.lastUpdated);
        setOfflineData(data);
      }
    } catch (error) {
      console.warn('Failed to load offline data:', error);
    }
  }, []);

  const syncOfflineData = useCallback(async () => {
    try {
      // This would sync any offline changes when back online
      console.log('Syncing offline data...');
      // Implementation would depend on your sync strategy
    } catch (error) {
      console.warn('Failed to sync offline data:', error);
    }
  }, []);

  const clearOfflineData = useCallback(() => {
    localStorage.removeItem('offline_data');
    setOfflineData(null);
  }, []);

  return {
    isOffline,
    offlineData,
    lastOnline,
    cacheCurrentData,
    clearOfflineData
  };
}

// Offline mode banner component
export function OfflineBanner() {
  const { isOffline, lastOnline } = useOfflineMode();

  if (!isOffline) return null;

  const timeSinceOnline = Date.now() - lastOnline.getTime();
  const hoursOffline = Math.floor(timeSinceOnline / (1000 * 60 * 60));
  const minutesOffline = Math.floor((timeSinceOnline % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>Offline Mode Active</strong> - 
          Last connected {hoursOffline > 0 ? `${hoursOffline}h ` : ''}{minutesOffline}m ago
        </div>
        <Badge variant="outline" className="text-orange-600 border-orange-300">
          Limited Functionality
        </Badge>
      </AlertDescription>
    </Alert>
  );
}

// Service unavailable component
export function ServiceUnavailable({ 
  serviceName, 
  retryFunction,
  estimatedRecovery,
  alternativeActions 
}: {
  serviceName: string;
  retryFunction?: () => void;
  estimatedRecovery?: Date;
  alternativeActions?: Array<{ label: string; action: () => void; icon?: ReactNode }>;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!retryFunction) return;
    
    setIsRetrying(true);
    try {
      await retryFunction();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <XCircle className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-red-800">Service Unavailable</CardTitle>
        <CardDescription className="text-red-700">
          {serviceName} is temporarily unavailable
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {estimatedRecovery && (
          <div className="bg-red-100 rounded-lg p-3">
            <div className="flex items-center justify-center text-red-700 text-sm">
              <Clock className="h-4 w-4 mr-2" />
              Estimated recovery: {estimatedRecovery.toLocaleString()}
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {retryFunction && (
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying}
              variant="outline"
              size="sm"
            >
              {isRetrying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Try Again
            </Button>
          )}
        </div>

        {alternativeActions && alternativeActions.length > 0 && (
          <div className="border-t border-red-200 pt-4">
            <p className="text-sm text-red-700 mb-3">Alternative actions:</p>
            <div className="space-y-2">
              {alternativeActions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.action}
                  variant="ghost"
                  size="sm"
                  className="text-red-700 hover:bg-red-100"
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Emergency contacts component
export function EmergencyContacts({ contacts }: { contacts?: EmergencyContact[] }) {
  const { offlineData } = useOfflineMode();
  const emergencyContacts = contacts || offlineData?.emergencyContacts || [];

  if (emergencyContacts.length === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-blue-800 flex items-center">
          <Phone className="mr-2 h-5 w-5" />
          Emergency Contacts
        </CardTitle>
        <CardDescription className="text-blue-700">
          Available for urgent assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {emergencyContacts.map((contact, index) => (
            <div key={index} className="bg-white rounded-lg p-3 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-blue-900">{contact.name}</h4>
                {contact.available24h && (
                  <Badge variant="secondary" className="text-green-600 bg-green-100">
                    24/7
                  </Badge>
                )}
              </div>
              <p className="text-sm text-blue-700 mb-2">{contact.role}</p>
              <div className="flex flex-col sm:flex-row gap-2 text-sm">
                <a 
                  href={`tel:${contact.phone}`}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  {contact.phone}
                </a>
                <a 
                  href={`mailto:${contact.email}`}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  {contact.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Cached data display component
export function CachedDataDisplay({ 
  title, 
  data, 
  lastUpdated, 
  onRefresh 
}: {
  title: string;
  data: any[];
  lastUpdated: Date;
  onRefresh?: () => void;
}) {
  const timeAgo = Date.now() - lastUpdated.getTime();
  const hoursAgo = Math.floor(timeAgo / (1000 * 60 * 60));
  const minutesAgo = Math.floor((timeAgo % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-yellow-800 flex items-center">
            <Database className="mr-2 h-5 w-5" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
            Cached Data
          </Badge>
        </div>
        <CardDescription className="text-yellow-700">
          Last updated {hoursAgo > 0 ? `${hoursAgo}h ` : ''}{minutesAgo}m ago
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {data.length === 0 ? (
            <p className="text-yellow-700 italic">No cached data available</p>
          ) : (
            data.slice(0, 5).map((item, index) => (
              <div key={index} className="bg-yellow-100 rounded p-2 text-sm text-yellow-800">
                {JSON.stringify(item).slice(0, 100)}...
              </div>
            ))
          )}
        </div>
        
        {onRefresh && (
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            size="sm"
            className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh when online
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Service status indicators
export function ServiceStatusGrid({ services }: { services: ServiceStatus[] }) {
  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100 border-green-200';
      case 'degraded': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'down': return 'text-red-600 bg-red-100 border-red-200';
      case 'maintenance': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'down': return <XCircle className="h-4 w-4" />;
      case 'maintenance': return <Zap className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {services.map((service, index) => (
        <Card key={index} className={`border ${getStatusColor(service.status)}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{service.name}</h4>
              <div className="flex items-center">
                {getStatusIcon(service.status)}
              </div>
            </div>
            <div className="text-sm opacity-75 mb-2">
              Last checked: {service.lastCheck.toLocaleTimeString()}
            </div>
            {service.responseTime && (
              <div className="text-sm opacity-75 mb-2">
                Response time: {service.responseTime}ms
              </div>
            )}
            {service.message && (
              <div className="text-sm italic">
                {service.message}
              </div>
            )}
            <Badge variant="outline" className="mt-2 text-xs">
              {service.status.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Skeleton loading components for different content types
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex space-x-4">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Progressive Web App install prompt
export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <Alert className="border-green-200 bg-green-50 mb-4">
      <Shield className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>Install App</strong> - Access the waste management system offline
        </div>
        <div className="flex gap-2">
          <Button onClick={handleInstall} size="sm" variant="outline">
            Install
          </Button>
          <Button onClick={() => setShowPrompt(false)} size="sm" variant="ghost">
            Later
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Error retry component with exponential backoff
export function RetryComponent({ 
  onRetry, 
  attempts = 0, 
  maxAttempts = 5,
  error 
}: {
  onRetry: () => Promise<void>;
  attempts?: number;
  maxAttempts?: number;
  error?: Error;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(attempts);

  const calculateDelay = (attempt: number) => {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  };

  const handleRetry = async () => {
    if (retryCount >= maxAttempts) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Add exponential backoff delay
      const delay = calculateDelay(retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      await onRetry();
      setRetryCount(0); // Reset on success
    } catch (error) {
      console.warn(`Retry attempt ${retryCount + 1} failed:`, error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="text-center p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Connection Issue</h3>
        <p className="text-gray-600">
          {error?.message || 'Something went wrong. Please try again.'}
        </p>
        
        {retryCount > 0 && (
          <p className="text-sm text-gray-500">
            Attempt {retryCount} of {maxAttempts}
          </p>
        )}
      </div>

      <Button 
        onClick={handleRetry} 
        disabled={isRetrying || retryCount >= maxAttempts}
      >
        {isRetrying ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Retrying...
          </>
        ) : retryCount >= maxAttempts ? (
          'Max attempts reached'
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </>
        )}
      </Button>
    </div>
  );
}

export default {
  OfflineBanner,
  ServiceUnavailable,
  EmergencyContacts,
  CachedDataDisplay,
  ServiceStatusGrid,
  DashboardSkeleton,
  TableSkeleton,
  PWAInstallPrompt,
  RetryComponent,
  useOfflineMode
};