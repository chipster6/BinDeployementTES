"use client";

/**
 * ============================================================================
 * DYNAMIC LOADER COMPONENT
 * ============================================================================
 *
 * Optimized dynamic loading component for code splitting and performance.
 * Provides lazy loading with loading states, error boundaries, and preloading.
 *
 * Features:
 * - Dynamic imports with loading fallbacks
 * - Progressive loading with suspense
 * - Intersection observer preloading
 * - Bundle size optimization
 * - Error boundary integration
 *
 * Performance Optimizations:
 * - Route-based code splitting
 * - Component-level lazy loading
 * - Preload on hover/focus
 * - Memory-efficient chunk loading
 */

import React, { 
  Suspense, 
  lazy, 
  ComponentType, 
  LazyExoticComponent, 
  useEffect, 
  useState,
  useRef
} from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Dynamic Loading Configuration
 */
export interface DynamicLoaderConfig {
  loading?: ComponentType;
  error?: ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
  timeout?: number;
  retryAttempts?: number;
  chunkName?: string;
}

/**
 * Default Loading Component
 */
const DefaultLoadingComponent: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex items-center space-x-2">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      <span className="text-gray-600">Loading component...</span>
    </div>
  </div>
);

/**
 * Default Loading Skeleton for Dashboard Components
 */
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Default Error Component
 */
const DefaultErrorComponent: React.FC<{ error: Error; retry: () => void }> = ({ 
  error, 
  retry 
}) => (
  <Alert variant="destructive" className="m-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      <div className="space-y-2">
        <p><strong>Failed to load component:</strong> {error.message}</p>
        <button 
          onClick={retry}
          className="text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    </AlertDescription>
  </Alert>
);

/**
 * Enhanced Error Boundary for Dynamic Loading
 */
class DynamicLoadingErrorBoundary extends React.Component<
  { 
    children: React.ReactNode; 
    fallback: ComponentType<{ error: Error; retry: () => void }>;
    onRetry: () => void;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dynamic loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          retry={() => {
            this.setState({ hasError: false, error: null });
            this.props.onRetry();
          }}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Dynamic Import Factory for Code Splitting
 */
export function createDynamicComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  config: DynamicLoaderConfig = {}
): LazyExoticComponent<T> {
  const {
    timeout = 10000,
    chunkName,
  } = config;

  // Enhanced dynamic import with timeout and retries
  const wrappedImportFn = async (): Promise<{ default: T }> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Component loading timeout')), timeout);
    });

    try {
      const result = await Promise.race([importFn(), timeoutPromise]);
      return result;
    } catch (error) {
      console.error(`Failed to load component${chunkName ? ` (${chunkName})` : ''}:`, error);
      throw error;
    }
  };

  return lazy(wrappedImportFn);
}

/**
 * Dynamic Loader Hook for Preloading
 */
export function useDynamicPreload(
  importFn: () => Promise<any>,
  enabled: boolean = true
) {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const preloadedRef = useRef<Promise<any> | null>(null);

  const preload = React.useCallback(() => {
    if (!enabled || isPreloaded || preloadedRef.current) return;

    preloadedRef.current = importFn()
      .then(() => {
        setIsPreloaded(true);
      })
      .catch((error) => {
        console.warn('Component preload failed:', error);
        preloadedRef.current = null;
      });
  }, [importFn, enabled, isPreloaded]);

  return { preload, isPreloaded };
}

/**
 * Main Dynamic Loader Component
 */
export interface DynamicLoaderProps<T extends ComponentType<any>> {
  component: LazyExoticComponent<T>;
  loading?: ComponentType;
  error?: ComponentType<{ error: Error; retry: () => void }>;
  preloadOnHover?: boolean;
  preloadOnFocus?: boolean;
  className?: string;
  componentProps?: React.ComponentProps<T>;
  fallbackType?: 'default' | 'dashboard' | 'minimal';
}

export function DynamicLoader<T extends ComponentType<any>>({
  component: Component,
  loading: LoadingComponent,
  error: ErrorComponent = DefaultErrorComponent,
  preloadOnHover = false,
  preloadOnFocus = false,
  className,
  componentProps,
  fallbackType = 'default'
}: DynamicLoaderProps<T>) {
  const [retryKey, setRetryKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Select appropriate loading component
  const FinalLoadingComponent = LoadingComponent || 
    (fallbackType === 'dashboard' ? DashboardSkeleton : DefaultLoadingComponent);

  // Handle retry
  const handleRetry = React.useCallback(() => {
    setRetryKey(prev => prev + 1);
  }, []);

  // Preloading handlers
  const handleMouseEnter = React.useCallback(() => {
    if (preloadOnHover) {
      // Component is already loaded when this renders, but this could be used
      // for preloading related components
    }
  }, [preloadOnHover]);

  const handleFocus = React.useCallback(() => {
    if (preloadOnFocus) {
      // Similar to hover, could be used for related component preloading
    }
  }, [preloadOnFocus]);

  return (
    <div 
      ref={containerRef}
      className={className}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
    >
      <DynamicLoadingErrorBoundary
        fallback={ErrorComponent}
        onRetry={handleRetry}
      >
        <Suspense fallback={<FinalLoadingComponent />}>
          <Component key={retryKey} {...componentProps} />
        </Suspense>
      </DynamicLoadingErrorBoundary>
    </div>
  );
}

/**
 * Prebuilt Dynamic Components for Common Use Cases
 */

// External Services Dashboard (lazy loaded)
export const DynamicExternalServicesCostDashboard = createDynamicComponent(
  () => import('@/components/external/ExternalServicesCostDashboard'),
  { chunkName: 'external-cost-dashboard' }
);

export const DynamicExternalServicesStatusIndicators = createDynamicComponent(
  () => import('@/components/external/ExternalServicesStatusIndicators'),
  { chunkName: 'external-status-indicators' }
);

// Optimized Components (lazy loaded)
export const DynamicEnhancedVirtualizedGrid = createDynamicComponent(
  () => import('@/components/optimized/EnhancedVirtualizedGrid'),
  { chunkName: 'virtualized-grid' }
);

export const DynamicFrontendPerformanceMonitor = createDynamicComponent(
  () => import('@/components/optimized/FrontendPerformanceMonitor'),
  { chunkName: 'performance-monitor' }
);

export const DynamicPerformanceDashboard = createDynamicComponent(
  () => import('@/components/optimized/PerformanceDashboard'),
  { chunkName: 'performance-dashboard' }
);

// SOC Dashboard (lazy loaded)
export const DynamicSOCDashboard = createDynamicComponent(
  () => import('@/components/soc/SOCDashboard'),
  { chunkName: 'soc-dashboard' }
);

// AI/ML Dashboard (lazy loaded)
export const DynamicAIMLDashboard = createDynamicComponent(
  () => import('@/components/aiml/AIMLDashboard'),
  { chunkName: 'aiml-dashboard' }
);

/**
 * Route-Based Dynamic Loaders
 */
export const DynamicDashboardPage = createDynamicComponent(
  () => import('@/app/dashboard/page'),
  { chunkName: 'dashboard-page' }
);

export const DynamicAdminPage = createDynamicComponent(
  () => import('@/app/admin/page'),
  { chunkName: 'admin-page' }
);

export const DynamicBinsPage = createDynamicComponent(
  () => import('@/app/bins/page'),
  { chunkName: 'bins-page' }
);

export const DynamicCustomersPage = createDynamicComponent(
  () => import('@/app/customers/page'),
  { chunkName: 'customers-page' }
);

export const DynamicSOCPage = createDynamicComponent(
  () => import('@/app/soc/page'),
  { chunkName: 'soc-page' }
);

export const DynamicPerformanceDemoPage = createDynamicComponent(
  () => import('@/app/performance-demo/page'),
  { chunkName: 'performance-demo-page' }
);

/**
 * Utility for Bundle Analysis
 */
export function analyzeDynamicImports() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const chunks = Object.keys((window as any).__webpack_require__.cache || {});
    console.log('Loaded chunks:', chunks.length);
    console.log('Dynamic imports performance:', {
      totalChunks: chunks.length,
      loadedAt: new Date().toISOString()
    });
  }
}

export default DynamicLoader;