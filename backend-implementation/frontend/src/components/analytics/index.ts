// Analytics Dashboard System
// Complete analytics solution for waste management operations

// Main router and access control
export { default as AnalyticsRouter } from './AnalyticsRouter';
export { 
  AnalyticsAccessProvider,
  useAnalyticsAccess,
  ProtectedAnalytics,
  RoleBasedFeature,
  useAnalyticsPermission,
  analyticsUtils
} from './AnalyticsAccessControl';

// Dashboard components
export { default as ExecutiveAnalyticsDashboard } from './ExecutiveAnalyticsDashboard';
export { default as OperationsAnalyticsDashboard } from './OperationsAnalyticsDashboard';
export { default as FleetAnalyticsDashboard } from './FleetAnalyticsDashboard';
export { default as FinancialAnalyticsDashboard } from './FinancialAnalyticsDashboard';

// Mobile analytics
export { default as MobileAnalyticsView } from './mobile/MobileAnalyticsView';

// Visualization components
export * from './charts';

// Data hooks
export * from '@/hooks/useAnalyticsAPI';
export { default as useAnalyticsWebSocket } from '@/hooks/useAnalyticsWebSocket';

// Types and interfaces
export interface AnalyticsDashboardProps {
  className?: string;
}

export interface MobileAnalyticsProps {
  userRole: 'driver' | 'dispatcher' | 'field_manager' | 'admin';
  className?: string;
}

// Dashboard configuration
export const dashboardConfig = {
  executive: {
    title: 'Executive Analytics',
    description: 'C-level operational intelligence and strategic insights',
    refreshInterval: 30000, // 30 seconds
    features: ['revenue-tracking', 'kpi-monitoring', 'trend-analysis', 'forecasting']
  },
  operations: {
    title: 'Operations Analytics',
    description: 'Real-time performance monitoring and operational metrics',
    refreshInterval: 10000, // 10 seconds
    features: ['real-time-tracking', 'performance-metrics', 'alerts', 'route-monitoring']
  },
  fleet: {
    title: 'Fleet Analytics',
    description: 'Vehicle performance and geospatial fleet management',
    refreshInterval: 15000, // 15 seconds
    features: ['vehicle-tracking', 'fuel-monitoring', 'maintenance-scheduling', 'route-optimization']
  },
  financial: {
    title: 'Financial Analytics',
    description: 'Revenue optimization and cost analysis',
    refreshInterval: 60000, // 1 minute
    features: ['revenue-analysis', 'cost-tracking', 'profitability', 'forecasting']
  },
  mobile: {
    title: 'Mobile Analytics',
    description: 'Field operations and mobile-optimized views',
    refreshInterval: 5000, // 5 seconds
    features: ['real-time-status', 'quick-actions', 'notifications', 'route-progress']
  }
};

// Analytics themes
export const analyticsThemes = {
  light: {
    background: 'bg-gray-50',
    card: 'bg-white',
    text: 'text-gray-900',
    accent: 'text-blue-600'
  },
  dark: {
    background: 'bg-gray-900',
    card: 'bg-gray-800',
    text: 'text-white',
    accent: 'text-blue-400'
  }
};

// Utility functions
export const analyticsHelpers = {
  formatCurrency: (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },
  
  formatPercentage: (value: number, decimals: number = 1) => {
    return `${value.toFixed(decimals)}%`;
  },
  
  formatLargeNumber: (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  },
  
  calculateTrend: (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: Math.abs(change),
      formatted: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
    };
  },
  
  getStatusColor: (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  },
  
  isMobileDevice: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },
  
  getScreenSize: () => {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 640) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
};

// Constants
export const ANALYTICS_CONSTANTS = {
  REFRESH_INTERVALS: {
    REAL_TIME: 5000,    // 5 seconds
    FAST: 10000,        // 10 seconds
    NORMAL: 30000,      // 30 seconds
    SLOW: 60000,        // 1 minute
    REPORTS: 300000     // 5 minutes
  },
  
  CACHE_TIMEOUTS: {
    REAL_TIME: 30000,   // 30 seconds
    METRICS: 120000,    // 2 minutes
    REPORTS: 300000,    // 5 minutes
    STATIC: 3600000     // 1 hour
  },
  
  WEBSOCKET_EVENTS: {
    METRICS_UPDATE: 'metrics:update',
    ALERT_TRIGGERED: 'alert:triggered',
    STATUS_CHANGE: 'status:change',
    ROUTE_UPDATE: 'route:update',
    FLEET_STATUS: 'fleet:status'
  },
  
  PERMISSIONS: {
    READ: 'read',
    WRITE: 'write',
    EXPORT: 'export',
    CONFIGURE: 'configure'
  }
};

// Error boundaries and loading states
export const AnalyticsLoadingState = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="text-gray-600">Loading analytics...</p>
    </div>
  </div>
);

export const AnalyticsErrorState = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center space-y-4 max-w-md">
      <div className="mx-auto p-3 bg-red-100 rounded-full w-fit">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Analytics Error</h3>
        <p className="text-gray-600 mt-2">{error}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  </div>
);

// Main analytics page component for easy integration
export const AnalyticsPage = ({ isMobile = false }: { isMobile?: boolean }) => {
  return (
    <AnalyticsAccessProvider>
      <AnalyticsRouter isMobile={isMobile} />
    </AnalyticsAccessProvider>
  );
};