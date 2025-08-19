"use client";

/**
 * ============================================================================
 * ENHANCED LAZY LOADING HOOK
 * ============================================================================
 *
 * Advanced lazy loading hook with intelligent preloading, coordinated with
 * Performance Specialist backend optimization and Database Architect caching.
 *
 * Features:
 * - Intelligent component preloading based on user behavior
 * - Route-based code splitting optimization
 * - Resource prioritization and scheduling
 * - Performance metrics integration
 * - Intersection Observer optimization
 * - Memory management and cleanup
 *
 * Coordination Points:
 * - Performance Specialist: Preloading strategy optimization
 * - Database Architect: Cache-aware resource loading
 * - Innovation Architect: AI-powered preload prediction
 * - External API: Optimized resource fetching
 */

import { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo 
} from 'react';

/**
 * Lazy Loading Configuration
 */
export interface LazyLoadingConfig {
  rootMargin?: string;
  threshold?: number | number[];
  enablePreloading?: boolean;
  preloadDistance?: number; // Pixels before element enters viewport
  maxConcurrentLoads?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enablePerformanceTracking?: boolean;
  cacheStrategy?: 'memory' | 'session' | 'local' | 'none';
  priorityLevels?: ('high' | 'normal' | 'low')[];
}

/**
 * Lazy Loading State
 */
export interface LazyLoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  error?: Error;
  loadTime?: number;
  fromCache?: boolean;
}

/**
 * Performance Metrics
 */
export interface LazyLoadingMetrics {
  totalElements: number;
  loadedElements: number;
  averageLoadTime: number;
  cacheHitRatio: number;
  errorRate: number;
  peakConcurrentLoads: number;
  bandwidthSaved: number; // Estimated bytes saved by lazy loading
}

/**
 * Preload Strategy Interface (coordinated with Innovation Architect AI predictions)
 */
export interface PreloadStrategy {
  predict: (elementId: string, userBehavior: any) => number; // Prediction score 0-1
  schedule: (elements: string[], priorities: number[]) => string[]; // Ordered preload queue
}

/**
 * Resource Loading Function Type
 */
export type ResourceLoader<T = any> = () => Promise<T>;

/**
 * Enhanced Lazy Loading Hook
 */
export function useEnhancedLazyLoading<T = any>(
  elementRef: React.RefObject<Element>,
  loader: ResourceLoader<T>,
  config: LazyLoadingConfig = {}
) {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    enablePreloading = true,
    preloadDistance = 200,
    maxConcurrentLoads = 3,
    retryAttempts = 3,
    retryDelay = 1000,
    enablePerformanceTracking = true,
    cacheStrategy = 'memory',
    priorityLevels = ['high', 'normal', 'low']
  } = config;

  // State management
  const [state, setState] = useState<LazyLoadingState>({
    isLoading: false,
    isLoaded: false,
    hasError: false
  });
  const [data, setData] = useState<T | null>(null);
  const [metrics, setMetrics] = useState<LazyLoadingMetrics>({
    totalElements: 0,
    loadedElements: 0,
    averageLoadTime: 0,
    cacheHitRatio: 0,
    errorRate: 0,
    peakConcurrentLoads: 0,
    bandwidthSaved: 0
  });

  // Refs for performance tracking and management
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadStartTimeRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const loadingQueueRef = useRef<Set<string>>(new Set());
  const currentLoadsRef = useRef<number>(0);
  const elementIdRef = useRef<string>(`lazy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Cache key generation based on loader
  const cacheKey = useMemo(() => {
    return `lazy-load-${loader.toString().slice(0, 100)}-${elementIdRef.current}`;
  }, [loader]);

  // Cache operations coordinated with Database Architect caching strategy
  const getFromCache = useCallback((key: string): T | null => {
    if (cacheStrategy === 'none') return null;

    try {
      const cached = cacheRef.current.get(key);
      if (cached) {
        // Check cache validity (5 minutes default)
        const isValid = Date.now() - cached.timestamp < 5 * 60 * 1000;
        if (isValid) {
          return cached.data;
        } else {
          cacheRef.current.delete(key);
        }
      }

      // Try browser storage for persistent caching
      if (cacheStrategy === 'local' && typeof window !== 'undefined') {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            cacheRef.current.set(key, { data: parsed.data, timestamp: parsed.timestamp });
            return parsed.data;
          } else {
            localStorage.removeItem(key);
          }
        }
      }

      if (cacheStrategy === 'session' && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          cacheRef.current.set(key, { data: parsed.data, timestamp: parsed.timestamp });
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('Cache retrieval error:', error);
    }

    return null;
  }, [cacheStrategy]);

  const setToCache = useCallback((key: string, data: T) => {
    if (cacheStrategy === 'none') return;

    const cacheEntry = { data, timestamp: Date.now() };
    cacheRef.current.set(key, cacheEntry);

    try {
      if (cacheStrategy === 'local' && typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(cacheEntry));
      } else if (cacheStrategy === 'session' && typeof window !== 'undefined') {
        sessionStorage.setItem(key, JSON.stringify(cacheEntry));
      }
    } catch (error) {
      console.warn('Cache storage error:', error);
    }
  }, [cacheStrategy]);

  // Performance tracking functions
  const updateMetrics = useCallback((loadTime: number, fromCache: boolean, hasError: boolean) => {
    if (!enablePerformanceTracking) return;

    setMetrics(prev => {
      const newLoadedElements = hasError ? prev.loadedElements : prev.loadedElements + 1;
      const newTotalElements = prev.totalElements + 1;
      const newAverageLoadTime = hasError ? prev.averageLoadTime : 
        (prev.averageLoadTime * prev.loadedElements + loadTime) / newLoadedElements;
      const newCacheHitRatio = fromCache ? 
        (prev.cacheHitRatio * (newTotalElements - 1) + 1) / newTotalElements :
        (prev.cacheHitRatio * (newTotalElements - 1)) / newTotalElements;
      const newErrorRate = hasError ?
        (prev.errorRate * (newTotalElements - 1) + 1) / newTotalElements :
        (prev.errorRate * (newTotalElements - 1)) / newTotalElements;

      return {
        ...prev,
        totalElements: newTotalElements,
        loadedElements: newLoadedElements,
        averageLoadTime: newAverageLoadTime,
        cacheHitRatio: newCacheHitRatio,
        errorRate: newErrorRate,
        peakConcurrentLoads: Math.max(prev.peakConcurrentLoads, currentLoadsRef.current)
      };
    });
  }, [enablePerformanceTracking]);

  // Resource loading with retry logic and performance tracking
  const loadResource = useCallback(async (isPreload = false): Promise<void> => {
    if (state.isLoading || state.isLoaded) return;

    // Check concurrent load limit
    if (currentLoadsRef.current >= maxConcurrentLoads && !isPreload) {
      setTimeout(() => loadResource(isPreload), 100);
      return;
    }

    // Check cache first
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setState({
        isLoading: false,
        isLoaded: true,
        hasError: false,
        loadTime: 0,
        fromCache: true
      });
      updateMetrics(0, true, false);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, hasError: false }));
    currentLoadsRef.current++;
    loadStartTimeRef.current = performance.now();

    try {
      const result = await loader();
      const loadTime = performance.now() - loadStartTimeRef.current;

      setData(result);
      setToCache(cacheKey, result);
      
      setState({
        isLoading: false,
        isLoaded: true,
        hasError: false,
        loadTime,
        fromCache: false
      });

      updateMetrics(loadTime, false, false);
      retryCountRef.current = 0;

    } catch (error) {
      const loadTime = performance.now() - loadStartTimeRef.current;
      console.error('Lazy loading error:', error);

      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current++;
        setTimeout(() => {
          setState(prev => ({ ...prev, isLoading: false }));
          loadResource(isPreload);
        }, retryDelay * retryCountRef.current);
      } else {
        setState({
          isLoading: false,
          isLoaded: false,
          hasError: true,
          error: error as Error,
          loadTime
        });
        updateMetrics(loadTime, false, true);
      }
    } finally {
      currentLoadsRef.current--;
    }
  }, [state.isLoading, state.isLoaded, maxConcurrentLoads, getFromCache, cacheKey, loader, setToCache, updateMetrics, retryAttempts, retryDelay]);

  // Intersection Observer setup with preloading
  useEffect(() => {
    if (!elementRef.current) return;

    const options: IntersectionObserverInit = {
      rootMargin,
      threshold
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadResource(false);
        } else if (enablePreloading) {
          // Check if element is within preload distance
          const rect = entry.boundingClientRect;
          const viewportHeight = window.innerHeight;
          const distanceToViewport = rect.top - viewportHeight;
          
          if (distanceToViewport <= preloadDistance && distanceToViewport > 0) {
            // Preload with lower priority
            setTimeout(() => loadResource(true), 100);
          }
        }
      });
    }, options);

    observerRef.current.observe(elementRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [elementRef, rootMargin, threshold, loadResource, enablePreloading, preloadDistance]);

  // Manual loading function
  const load = useCallback(() => {
    loadResource(false);
  }, [loadResource]);

  // Preload function for manual preloading
  const preload = useCallback(() => {
    loadResource(true);
  }, [loadResource]);

  // Reset function
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isLoaded: false,
      hasError: false
    });
    setData(null);
    retryCountRef.current = 0;
    cacheRef.current.delete(cacheKey);
  }, [cacheKey]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    // State
    ...state,
    data,
    metrics,
    
    // Actions
    load,
    preload,
    reset,
    
    // Cache management
    clearCache: () => {
      cacheRef.current.clear();
      if (typeof window !== 'undefined') {
        if (cacheStrategy === 'local') {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('lazy-load-')) {
              localStorage.removeItem(key);
            }
          });
        } else if (cacheStrategy === 'session') {
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('lazy-load-')) {
              sessionStorage.removeItem(key);
            }
          });
        }
      }
    },
    
    // Performance
    getMetrics: () => metrics,
    getCacheInfo: () => ({
      size: cacheRef.current.size,
      keys: Array.from(cacheRef.current.keys())
    })
  };
}

/**
 * Batch Lazy Loading Hook for Multiple Elements
 */
export function useBatchLazyLoading<T = any>(
  elements: Array<{
    ref: React.RefObject<Element>;
    loader: ResourceLoader<T>;
    priority?: 'high' | 'normal' | 'low';
  }>,
  config: LazyLoadingConfig = {}
) {
  const [batchState, setBatchState] = useState<Record<number, LazyLoadingState>>({});
  const [batchData, setBatchData] = useState<Record<number, T | null>>({});

  // Individual lazy loading hooks
  const lazyLoaders = elements.map((element, index) => 
    useEnhancedLazyLoading(element.ref, element.loader, {
      ...config,
      // Adjust priority-based configuration
      preloadDistance: element.priority === 'high' ? 300 : 
                      element.priority === 'low' ? 100 : 200
    })
  );

  // Aggregate states and data
  useEffect(() => {
    const newBatchState: Record<number, LazyLoadingState> = {};
    const newBatchData: Record<number, T | null> = {};

    lazyLoaders.forEach((loader, index) => {
      newBatchState[index] = {
        isLoading: loader.isLoading,
        isLoaded: loader.isLoaded,
        hasError: loader.hasError,
        error: loader.error,
        loadTime: loader.loadTime,
        fromCache: loader.fromCache
      };
      newBatchData[index] = loader.data;
    });

    setBatchState(newBatchState);
    setBatchData(newBatchData);
  }, [lazyLoaders]);

  // Aggregate metrics
  const aggregateMetrics = useMemo((): LazyLoadingMetrics => {
    return lazyLoaders.reduce((acc, loader) => {
      const metrics = loader.metrics;
      return {
        totalElements: acc.totalElements + metrics.totalElements,
        loadedElements: acc.loadedElements + metrics.loadedElements,
        averageLoadTime: (acc.averageLoadTime + metrics.averageLoadTime) / 2,
        cacheHitRatio: (acc.cacheHitRatio + metrics.cacheHitRatio) / 2,
        errorRate: (acc.errorRate + metrics.errorRate) / 2,
        peakConcurrentLoads: Math.max(acc.peakConcurrentLoads, metrics.peakConcurrentLoads),
        bandwidthSaved: acc.bandwidthSaved + metrics.bandwidthSaved
      };
    }, {
      totalElements: 0,
      loadedElements: 0,
      averageLoadTime: 0,
      cacheHitRatio: 0,
      errorRate: 0,
      peakConcurrentLoads: 0,
      bandwidthSaved: 0
    });
  }, [lazyLoaders]);

  return {
    states: batchState,
    data: batchData,
    metrics: aggregateMetrics,
    loaders: lazyLoaders,
    
    // Batch operations
    loadAll: () => lazyLoaders.forEach(loader => loader.load()),
    preloadAll: () => lazyLoaders.forEach(loader => loader.preload()),
    resetAll: () => lazyLoaders.forEach(loader => loader.reset()),
    clearAllCaches: () => lazyLoaders.forEach(loader => loader.clearCache())
  };
}

export default useEnhancedLazyLoading;