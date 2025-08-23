'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';

interface AnalyticsPermission {
  read: boolean;
  write: boolean;
  export: boolean;
  configure: boolean;
}

interface AnalyticsPermissions {
  executive: AnalyticsPermission;
  operations: AnalyticsPermission;
  fleet: AnalyticsPermission;
  financial: AnalyticsPermission;
  customer: AnalyticsPermission;
  realtime: AnalyticsPermission;
  reports: AnalyticsPermission;
  predictive: AnalyticsPermission;
}

interface UserPreferences {
  defaultDashboard: string;
  autoRefresh: boolean;
  refreshInterval: number;
  notifications: {
    alerts: boolean;
    reports: boolean;
    thresholds: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    density: 'compact' | 'comfortable' | 'spacious';
    currency: string;
    timezone: string;
  };
  widgets: {
    enabled: string[];
    layout: Record<string, any>;
    customizations: Record<string, any>;
  };
}

interface AnalyticsAccessContextType {
  permissions: AnalyticsPermissions;
  preferences: UserPreferences;
  hasPermission: (area: keyof AnalyticsPermissions, action: keyof AnalyticsPermission) => boolean;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  canAccessDashboard: (dashboardType: string) => boolean;
  getAvailableDashboards: () => string[];
  getDefaultDashboard: () => string;
  savePreferences: () => Promise<void>;
  resetPreferences: () => void;
}

const AnalyticsAccessContext = createContext<AnalyticsAccessContextType | undefined>(undefined);

// Default permissions by role
const rolePermissions: Record<UserRole, AnalyticsPermissions> = {
  [UserRole.SUPER_ADMIN]: {
    executive: { read: true, write: true, export: true, configure: true },
    operations: { read: true, write: true, export: true, configure: true },
    fleet: { read: true, write: true, export: true, configure: true },
    financial: { read: true, write: true, export: true, configure: true },
    customer: { read: true, write: true, export: true, configure: true },
    realtime: { read: true, write: true, export: true, configure: true },
    reports: { read: true, write: true, export: true, configure: true },
    predictive: { read: true, write: true, export: true, configure: true }
  },
  [UserRole.ADMIN]: {
    executive: { read: true, write: false, export: true, configure: false },
    operations: { read: true, write: true, export: true, configure: true },
    fleet: { read: true, write: true, export: true, configure: true },
    financial: { read: true, write: false, export: true, configure: false },
    customer: { read: true, write: true, export: true, configure: false },
    realtime: { read: true, write: false, export: true, configure: false },
    reports: { read: true, write: true, export: true, configure: true },
    predictive: { read: true, write: false, export: true, configure: false }
  },
  [UserRole.DISPATCHER]: {
    executive: { read: false, write: false, export: false, configure: false },
    operations: { read: true, write: true, export: true, configure: false },
    fleet: { read: true, write: true, export: true, configure: false },
    financial: { read: false, write: false, export: false, configure: false },
    customer: { read: true, write: false, export: false, configure: false },
    realtime: { read: true, write: false, export: false, configure: false },
    reports: { read: true, write: false, export: true, configure: false },
    predictive: { read: true, write: false, export: false, configure: false }
  },
  [UserRole.OFFICE_STAFF]: {
    executive: { read: false, write: false, export: false, configure: false },
    operations: { read: true, write: false, export: true, configure: false },
    fleet: { read: false, write: false, export: false, configure: false },
    financial: { read: true, write: false, export: true, configure: false },
    customer: { read: true, write: true, export: true, configure: false },
    realtime: { read: false, write: false, export: false, configure: false },
    reports: { read: true, write: false, export: true, configure: false },
    predictive: { read: false, write: false, export: false, configure: false }
  },
  [UserRole.DRIVER]: {
    executive: { read: false, write: false, export: false, configure: false },
    operations: { read: true, write: false, export: false, configure: false },
    fleet: { read: true, write: false, export: false, configure: false },
    financial: { read: false, write: false, export: false, configure: false },
    customer: { read: false, write: false, export: false, configure: false },
    realtime: { read: true, write: false, export: false, configure: false },
    reports: { read: false, write: false, export: false, configure: false },
    predictive: { read: false, write: false, export: false, configure: false }
  },
  [UserRole.CUSTOMER]: {
    executive: { read: false, write: false, export: false, configure: false },
    operations: { read: false, write: false, export: false, configure: false },
    fleet: { read: false, write: false, export: false, configure: false },
    financial: { read: true, write: false, export: true, configure: false },
    customer: { read: true, write: false, export: true, configure: false },
    realtime: { read: false, write: false, export: false, configure: false },
    reports: { read: true, write: false, export: true, configure: false },
    predictive: { read: false, write: false, export: false, configure: false }
  },
  [UserRole.CUSTOMER_STAFF]: {
    executive: { read: false, write: false, export: false, configure: false },
    operations: { read: false, write: false, export: false, configure: false },
    fleet: { read: false, write: false, export: false, configure: false },
    financial: { read: true, write: false, export: false, configure: false },
    customer: { read: true, write: false, export: false, configure: false },
    realtime: { read: false, write: false, export: false, configure: false },
    reports: { read: true, write: false, export: false, configure: false },
    predictive: { read: false, write: false, export: false, configure: false }
  }
};

// Default preferences by role
const getDefaultPreferences = (role: UserRole): UserPreferences => {
  const basePreferences: UserPreferences = {
    defaultDashboard: 'operations',
    autoRefresh: true,
    refreshInterval: 30000,
    notifications: {
      alerts: true,
      reports: false,
      thresholds: true
    },
    display: {
      theme: 'light',
      density: 'comfortable',
      currency: 'USD',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    widgets: {
      enabled: [],
      layout: {},
      customizations: {}
    }
  };

  switch (role) {
    case UserRole.SUPER_ADMIN:
    case UserRole.ADMIN:
      return {
        ...basePreferences,
        defaultDashboard: 'executive',
        widgets: {
          enabled: ['executive-metrics', 'operations-overview', 'fleet-status', 'financial-summary'],
          layout: { columns: 4, rows: 3 },
          customizations: { showTrends: true, showAlerts: true }
        }
      };
    
    case UserRole.DISPATCHER:
      return {
        ...basePreferences,
        defaultDashboard: 'operations',
        refreshInterval: 10000, // Faster refresh for dispatchers
        widgets: {
          enabled: ['operations-metrics', 'fleet-status', 'real-time-tracking'],
          layout: { columns: 3, rows: 2 },
          customizations: { showMap: true, showAlerts: true }
        }
      };
    
    case UserRole.OFFICE_STAFF:
      return {
        ...basePreferences,
        defaultDashboard: 'customer',
        widgets: {
          enabled: ['customer-metrics', 'financial-overview', 'reports-summary'],
          layout: { columns: 2, rows: 3 },
          customizations: { showCustomerDetails: true }
        }
      };
    
    case UserRole.DRIVER:
      return {
        ...basePreferences,
        defaultDashboard: 'mobile',
        refreshInterval: 5000, // Very fast for drivers
        display: {
          ...basePreferences.display,
          density: 'spacious' // Better for mobile
        },
        widgets: {
          enabled: ['route-progress', 'vehicle-status', 'next-collection'],
          layout: { columns: 1, rows: 4 },
          customizations: { mobileOptimized: true, largeButtons: true }
        }
      };
    
    case UserRole.CUSTOMER:
    case UserRole.CUSTOMER_STAFF:
      return {
        ...basePreferences,
        defaultDashboard: 'customer',
        autoRefresh: false, // Customers prefer manual refresh
        notifications: {
          alerts: false,
          reports: true,
          thresholds: false
        },
        widgets: {
          enabled: ['service-status', 'billing-summary', 'collection-schedule'],
          layout: { columns: 2, rows: 2 },
          customizations: { showBilling: true, showSchedule: true }
        }
      };
    
    default:
      return basePreferences;
  }
};

interface AnalyticsAccessProviderProps {
  children: ReactNode;
}

export function AnalyticsAccessProvider({ children }: AnalyticsAccessProviderProps) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Initialize permissions and preferences
  const permissions = user?.role ? rolePermissions[user.role] : rolePermissions[UserRole.CUSTOMER];

  useEffect(() => {
    if (user?.role) {
      loadUserPreferences();
    }
  }, [user?.role]);

  const loadUserPreferences = async () => {
    try {
      // Try to load from localStorage first
      const saved = localStorage.getItem(`analytics-preferences-${user?.id}`);
      if (saved) {
        const savedPreferences = JSON.parse(saved);
        setPreferences(savedPreferences);
      } else {
        // Use role-based defaults
        const defaultPrefs = getDefaultPreferences(user?.role || UserRole.CUSTOMER);
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      const defaultPrefs = getDefaultPreferences(user?.role || UserRole.CUSTOMER);
      setPreferences(defaultPrefs);
    }
  };

  const hasPermission = (area: keyof AnalyticsPermissions, action: keyof AnalyticsPermission): boolean => {
    return permissions[area][action];
  };

  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    if (!preferences) return;
    
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    
    // Auto-save to localStorage
    try {
      localStorage.setItem(`analytics-preferences-${user?.id}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const canAccessDashboard = (dashboardType: string): boolean => {
    switch (dashboardType) {
      case 'executive':
        return hasPermission('executive', 'read');
      case 'operations':
        return hasPermission('operations', 'read');
      case 'fleet':
        return hasPermission('fleet', 'read');
      case 'financial':
        return hasPermission('financial', 'read');
      case 'customer':
        return hasPermission('customer', 'read');
      case 'mobile':
        return hasPermission('realtime', 'read');
      default:
        return false;
    }
  };

  const getAvailableDashboards = (): string[] => {
    const dashboards = [];
    
    if (canAccessDashboard('executive')) dashboards.push('executive');
    if (canAccessDashboard('operations')) dashboards.push('operations');
    if (canAccessDashboard('fleet')) dashboards.push('fleet');
    if (canAccessDashboard('financial')) dashboards.push('financial');
    if (canAccessDashboard('customer')) dashboards.push('customer');
    if (canAccessDashboard('mobile')) dashboards.push('mobile');
    
    return dashboards;
  };

  const getDefaultDashboard = (): string => {
    const available = getAvailableDashboards();
    const preferred = preferences?.defaultDashboard;
    
    if (preferred && available.includes(preferred)) {
      return preferred;
    }
    
    return available[0] || 'operations';
  };

  const savePreferences = async (): Promise<void> => {
    try {
      // Save to localStorage
      if (preferences && user?.id) {
        localStorage.setItem(`analytics-preferences-${user.id}`, JSON.stringify(preferences));
      }
      
      // TODO: Save to backend API
      // await fetch('/api/user/preferences', {
      //   method: 'POST',
      //   body: JSON.stringify(preferences)
      // });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  };

  const resetPreferences = () => {
    if (user?.role) {
      const defaultPrefs = getDefaultPreferences(user.role);
      setPreferences(defaultPrefs);
      
      try {
        localStorage.removeItem(`analytics-preferences-${user.id}`);
      } catch (error) {
        console.error('Failed to clear stored preferences:', error);
      }
    }
  };

  if (!preferences) {
    return <div>Loading analytics...</div>;
  }

  const contextValue: AnalyticsAccessContextType = {
    permissions,
    preferences,
    hasPermission,
    updatePreferences,
    canAccessDashboard,
    getAvailableDashboards,
    getDefaultDashboard,
    savePreferences,
    resetPreferences
  };

  return (
    <AnalyticsAccessContext.Provider value={contextValue}>
      {children}
    </AnalyticsAccessContext.Provider>
  );
}

export function useAnalyticsAccess(): AnalyticsAccessContextType {
  const context = useContext(AnalyticsAccessContext);
  if (!context) {
    throw new Error('useAnalyticsAccess must be used within an AnalyticsAccessProvider');
  }
  return context;
}

// Higher-order component for protecting analytics routes
interface ProtectedAnalyticsProps {
  children: ReactNode;
  requiredArea: keyof AnalyticsPermissions;
  requiredAction?: keyof AnalyticsPermission;
  fallback?: ReactNode;
}

export function ProtectedAnalytics({ 
  children, 
  requiredArea, 
  requiredAction = 'read',
  fallback = <div className="p-4 text-center text-gray-600">Access denied</div>
}: ProtectedAnalyticsProps) {
  const { hasPermission } = useAnalyticsAccess();
  
  if (!hasPermission(requiredArea, requiredAction)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Hook for checking specific permissions
export function useAnalyticsPermission(area: keyof AnalyticsPermissions) {
  const { hasPermission } = useAnalyticsAccess();
  
  return {
    canRead: hasPermission(area, 'read'),
    canWrite: hasPermission(area, 'write'),
    canExport: hasPermission(area, 'export'),
    canConfigure: hasPermission(area, 'configure'),
    hasAnyAccess: hasPermission(area, 'read') || hasPermission(area, 'write') || 
                   hasPermission(area, 'export') || hasPermission(area, 'configure')
  };
}

// Component for role-based feature flags
interface RoleBasedFeatureProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleBasedFeature({ roles, children, fallback = null }: RoleBasedFeatureProps) {
  const { user } = useAuth();
  
  if (!user?.role || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Utility functions for permission checking
export const analyticsUtils = {
  getRoleDisplayName: (role: UserRole): string => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return 'Super Administrator';
      case UserRole.ADMIN: return 'Administrator';
      case UserRole.DISPATCHER: return 'Dispatcher';
      case UserRole.OFFICE_STAFF: return 'Office Staff';
      case UserRole.DRIVER: return 'Driver';
      case UserRole.CUSTOMER: return 'Customer';
      case UserRole.CUSTOMER_STAFF: return 'Customer Staff';
      default: return 'Unknown';
    }
  },
  
  getDashboardTitle: (type: string): string => {
    switch (type) {
      case 'executive': return 'Executive Analytics';
      case 'operations': return 'Operations Analytics';
      case 'fleet': return 'Fleet Analytics';
      case 'financial': return 'Financial Analytics';
      case 'customer': return 'Customer Analytics';
      case 'mobile': return 'Mobile Analytics';
      default: return 'Analytics';
    }
  },
  
  getPermissionLevel: (permissions: AnalyticsPermission): 'none' | 'read' | 'write' | 'admin' => {
    if (permissions.configure) return 'admin';
    if (permissions.write) return 'write';
    if (permissions.read) return 'read';
    return 'none';
  }
};