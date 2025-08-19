"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
  maxRetries?: number;
  retryDelay?: number;
  backgroundRefresh?: boolean; // Refresh in background when near expiry
  backgroundRefreshThreshold?: number; // Percentage of TTL when to trigger background refresh
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  promise?: Promise<T>;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRatio: number;
  lastResetTime: number;
}

class FrontendCacheManager {
  private static instance: FrontendCacheManager;
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRatio: 0,
    lastResetTime: Date.now()
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  static getInstance(): FrontendCacheManager {
    if (!FrontendCacheManager.instance) {
      FrontendCacheManager.instance = new FrontendCacheManager();
    }
    return FrontendCacheManager.instance;
  }

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.cleanupInterval) {
          clearInterval(this.cleanupInterval);
        }
      });
    }
  }

  private generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}:${paramString}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private isNearExpiry(entry: CacheEntry<any>, threshold: number = 0.8): boolean {
    const timeElapsed = Date.now() - entry.timestamp;
    return timeElapsed > (entry.ttl * threshold);
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      staleWhileRevalidate = true,
      maxRetries = 3,
      retryDelay = 1000,
      backgroundRefresh = true,
      backgroundRefreshThreshold = 0.8
    } = config;

    this.metrics.totalRequests++;

    const existingEntry = this.cache.get(key);

    // Cache hit with valid data
    if (existingEntry && !this.isExpired(existingEntry)) {
      this.metrics.hits++;
      this.updateMetrics();

      // Background refresh if near expiry
      if (backgroundRefresh && this.isNearExpiry(existingEntry, backgroundRefreshThreshold)) {
        this.backgroundRefresh(key, fetcher, ttl, maxRetries, retryDelay);
      }

      return existingEntry.data;
    }

    // Cache hit with stale data
    if (existingEntry && staleWhileRevalidate) {
      this.metrics.hits++;
      this.updateMetrics();

      // Start revalidation in background
      this.backgroundRefresh(key, fetcher, ttl, maxRetries, retryDelay);
      return existingEntry.data;
    }

    // Cache miss or expired data without stale-while-revalidate
    this.metrics.misses++;
    this.updateMetrics();

    // Check if there's an ongoing fetch for this key
    if (existingEntry?.promise) {
      return existingEntry.promise;
    }

    // Fetch new data with retries
    const fetchPromise = this.fetchWithRetry(fetcher, maxRetries, retryDelay);
    
    // Store promise to prevent duplicate requests
    if (existingEntry) {
      existingEntry.promise = fetchPromise;
    } else {
      this.cache.set(key, {
        data: null,
        timestamp: Date.now(),
        ttl,
        promise: fetchPromise
      });
    }

    try {
      const data = await fetchPromise;
      
      // Update cache with fresh data
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        promise: undefined
      });

      return data;
    } catch (error) {
      // Remove failed promise
      const entry = this.cache.get(key);
      if (entry) {
        entry.promise = undefined;
      }
      throw error;
    }
  }

  private async fetchWithRetry<T>(
    fetcher: () => Promise<T>,
    maxRetries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetcher();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError!;
  }

  private async backgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    maxRetries: number,
    retryDelay: number
  ): Promise<void> {
    try {
      const data = await this.fetchWithRetry(fetcher, maxRetries, retryDelay);
      
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        promise: undefined
      });
    } catch (error) {
      console.warn('Background refresh failed for key:', key, error);
    }
  }

  invalidate(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
    this.resetMetrics();
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 2) { // Keep stale data for a bit longer
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private updateMetrics(): void {
    this.metrics.hitRatio = this.metrics.totalRequests > 0 
      ? this.metrics.hits / this.metrics.totalRequests 
      : 0;
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRatio: 0,
      lastResetTime: Date.now()
    };
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

// Hook for coordinated frontend caching with backend CachedStatisticsService
export function useCachedAPI<T>(
  url: string,
  params?: Record<string, any>,
  config: CacheConfig = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const cacheManager = useRef(FrontendCacheManager.getInstance());
  const abortControllerRef = useRef<AbortController | null>(null);

  const cacheKey = useMemo(() => {
    return cacheManager.current.generateKey(url, params);
  }, [url, params]);

  const fetcher = useCallback(async (): Promise<T> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    const queryParams = params ? new URLSearchParams(params).toString() : '';
    const fullUrl = queryParams ? `${url}?${queryParams}` : url;

    const response = await fetch(fullUrl, {
      signal: abortControllerRef.current.signal,
      headers: {
        'Content-Type': 'application/json',
        // Add cache-control headers to coordinate with backend
        'Cache-Control': config.staleWhileRevalidate ? 'stale-while-revalidate=300' : 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  }, [url, params, config.staleWhileRevalidate]);

  const refreshData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const cacheConfig = forceRefresh 
        ? { ...config, ttl: 0 } // Force cache miss
        : config;

      const result = await cacheManager.current.get(cacheKey, fetcher, cacheConfig);
      
      setData(result);
      setLastUpdated(new Date());
      setIsStale(false);
    } catch (err) {
      setError(err as Error);
      console.error('API fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, fetcher, config]);

  // Check for stale data
  useEffect(() => {
    if (data && lastUpdated && config.ttl) {
      const checkStale = () => {
        const age = Date.now() - lastUpdated.getTime();
        setIsStale(age > config.ttl! * 0.8); // Mark as stale at 80% of TTL
      };

      const interval = setInterval(checkStale, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [data, lastUpdated, config.ttl]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const invalidateCache = useCallback((pattern?: string) => {
    const invalidationPattern = pattern || url;
    cacheManager.current.invalidate(invalidationPattern);
  }, [url]);

  const cachedData: CachedData<T> = {
    data: data!,
    timestamp: lastUpdated?.getTime() || 0,
    isStale,
    isLoading,
    error,
    lastUpdated: lastUpdated || new Date()
  };

  return {
    ...cachedData,
    refresh: () => refreshData(false),
    forceRefresh: () => refreshData(true),
    invalidateCache,
    cacheMetrics: cacheManager.current.getMetrics(),
    cacheSize: cacheManager.current.getCacheSize()
  };
}

// Specialized hooks for coordinating with backend CachedStatisticsService

export function useCachedStatistics(
  type: 'routes' | 'bins' | 'dashboard' | 'serviceEvents',
  customerId?: string,
  config: CacheConfig = {}
) {
  const url = `/api/statistics/${type}`;
  const params = customerId ? { customerId } : undefined;
  
  // Coordinate cache TTL with backend service
  const coordinatedConfig: CacheConfig = {
    ttl: type === 'dashboard' ? 3 * 60 * 1000 : // 3 minutes for dashboard
         type === 'routes' ? 15 * 60 * 1000 :    // 15 minutes for routes
         type === 'bins' ? 10 * 60 * 1000 :      // 10 minutes for bins
         5 * 60 * 1000,                           // 5 minutes for service events
    staleWhileRevalidate: true,
    backgroundRefresh: true,
    backgroundRefreshThreshold: 0.7, // Refresh at 70% of TTL
    ...config
  };

  return useCachedAPI(url, params, coordinatedConfig);
}

export function useCachedPerformanceMetrics(config: CacheConfig = {}) {
  const coordinatedConfig: CacheConfig = {
    ttl: 30 * 1000, // 30 seconds for performance metrics
    staleWhileRevalidate: true,
    backgroundRefresh: true,
    backgroundRefreshThreshold: 0.5, // Refresh at 50% of TTL
    ...config
  };

  return useCachedAPI('/api/performance/metrics', undefined, coordinatedConfig);
}

export function useCachedDatabaseStatus(config: CacheConfig = {}) {
  const coordinatedConfig: CacheConfig = {
    ttl: 60 * 1000, // 1 minute for database status
    staleWhileRevalidate: true,
    backgroundRefresh: true,
    backgroundRefreshThreshold: 0.6, // Refresh at 60% of TTL
    ...config
  };

  return useCachedAPI('/api/performance/database', undefined, coordinatedConfig);
}

// Global cache management functions
export const cacheManager = {
  invalidateAll: () => FrontendCacheManager.getInstance().clear(),
  invalidatePattern: (pattern: string) => FrontendCacheManager.getInstance().invalidate(pattern),
  getMetrics: () => FrontendCacheManager.getInstance().getMetrics(),
  getCacheSize: () => FrontendCacheManager.getInstance().getCacheSize()
};

export default useCachedAPI;