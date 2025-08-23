'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface APIConfig {
  baseUrl?: string;
  refreshInterval?: number;
  cacheTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface UseAnalyticsAPIReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
  isStale: boolean;
}

class AnalyticsAPICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTimeout = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, timeout?: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + (timeout || this.defaultTimeout)
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  isStale(key: string, maxAge: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    return Date.now() - entry.timestamp > maxAge;
  }

  clear(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const apiCache = new AnalyticsAPICache();

export default function useAnalyticsAPI<T = any>(
  endpoint: string,
  config: APIConfig = {}
): UseAnalyticsAPIReturn<T> {
  const {
    baseUrl = '/api/analytics',
    refreshInterval = 0, // 0 means no auto-refresh
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    retryAttempts = 3,
    retryDelay = 1000
  } = config;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheKey = `${baseUrl}${endpoint}`;

  const isStale = apiCache.isStale(cacheKey, cacheTimeout);

  const fetchWithRetry = useCallback(async (
    url: string, 
    options: RequestInit, 
    attempt: number = 1
  ): Promise<Response> => {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (err) {
      if (attempt < retryAttempts && !options.signal?.aborted) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        return fetchWithRetry(url, options, attempt + 1);
      }
      throw err;
    }
  }, [retryAttempts, retryDelay]);

  const fetchData = useCallback(async (force: boolean = false) => {
    // Check cache first unless force refresh
    if (!force) {
      const cachedData = apiCache.get<T>(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setError(null);
        return;
      }
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': force ? 'no-cache' : 'max-age=300',
        },
        signal: abortControllerRef.current.signal,
      });

      const result = await response.json();
      
      // Transform response if needed
      const transformedData = transformAPIResponse<T>(result);
      
      setData(transformedData);
      setLastUpdated(new Date());
      setError(null);
      
      // Cache the result
      apiCache.set(cacheKey, transformedData, cacheTimeout);
      
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, don't set error
      }
      
      const errorMessage = err.message || 'Failed to fetch analytics data';
      setError(errorMessage);
      console.error(`Analytics API error for ${endpoint}:`, err);
      
      // Try to use stale cache data if available
      const staleData = apiCache.get<T>(cacheKey);
      if (staleData && !data) {
        setData(staleData);
        setError(`${errorMessage} (showing cached data)`);
      }
    } finally {
      setLoading(false);
    }
  }, [baseUrl, endpoint, cacheKey, cacheTimeout, fetchWithRetry, data]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const clearCache = useCallback(() => {
    apiCache.clear(cacheKey);
  }, [cacheKey]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshInterval, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch,
    clearCache,
    isStale
  };
}

// Utility function to transform API responses
function transformAPIResponse<T>(response: any): T {
  // Handle different response structures
  if (response.data) {
    return response.data;
  }
  
  if (response.result) {
    return response.result;
  }
  
  // Handle pagination
  if (response.items || response.results) {
    return (response.items || response.results);
  }
  
  return response;
}

// Specialized hooks for different analytics endpoints
export function useExecutiveMetrics() {
  return useAnalyticsAPI('/executive/metrics', {
    refreshInterval: 30000, // 30 seconds
    cacheTimeout: 2 * 60 * 1000 // 2 minutes
  });
}

export function useOperationalMetrics() {
  return useAnalyticsAPI('/operations/metrics', {
    refreshInterval: 10000, // 10 seconds
    cacheTimeout: 1 * 60 * 1000 // 1 minute
  });
}

export function useFleetMetrics() {
  return useAnalyticsAPI('/fleet/metrics', {
    refreshInterval: 15000, // 15 seconds
    cacheTimeout: 2 * 60 * 1000 // 2 minutes
  });
}

export function useFinancialMetrics() {
  return useAnalyticsAPI('/financial/metrics', {
    refreshInterval: 60000, // 1 minute
    cacheTimeout: 5 * 60 * 1000 // 5 minutes
  });
}

export function useRevenueAnalysis(period: string = 'monthly') {
  return useAnalyticsAPI(`/financial/revenue?period=${period}`, {
    refreshInterval: 300000, // 5 minutes
    cacheTimeout: 10 * 60 * 1000 // 10 minutes
  });
}

export function useCostAnalysis(period: string = 'monthly') {
  return useAnalyticsAPI(`/financial/costs?period=${period}`, {
    refreshInterval: 300000, // 5 minutes
    cacheTimeout: 10 * 60 * 1000 // 10 minutes
  });
}

export function useCustomerAnalytics() {
  return useAnalyticsAPI('/customers/analytics', {
    refreshInterval: 120000, // 2 minutes
    cacheTimeout: 5 * 60 * 1000 // 5 minutes
  });
}

export function useRouteOptimization() {
  return useAnalyticsAPI('/routes/optimization', {
    refreshInterval: 20000, // 20 seconds
    cacheTimeout: 2 * 60 * 1000 // 2 minutes
  });
}

export function usePerformanceMetrics() {
  return useAnalyticsAPI('/performance/metrics', {
    refreshInterval: 15000, // 15 seconds
    cacheTimeout: 2 * 60 * 1000 // 2 minutes
  });
}

// Cache management utilities
export const analyticsCache = {
  clear: (pattern?: string) => apiCache.clear(pattern),
  size: () => apiCache.size(),
  clearAll: () => apiCache.clear()
};