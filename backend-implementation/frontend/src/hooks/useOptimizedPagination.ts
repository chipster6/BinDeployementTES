"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import useCachedAPI, { CacheConfig } from './useCachedAPI';

export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    offset: number;
  };
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOption {
  field: string;
  value: any;
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin';
}

export interface PaginationConfig extends CacheConfig {
  defaultLimit?: number;
  maxLimit?: number;
  preloadPages?: number; // Number of pages to preload ahead
  enableInfiniteScroll?: boolean;
  virtualScrolling?: boolean;
  debounceMs?: number; // Debounce for search/filter changes
}

export interface PaginationState<T> {
  currentPage: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  data: T[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  cacheMetrics: {
    hitRatio: number;
    totalRequests: number;
  };
}

// Optimized pagination hook coordinating with Database Architect's BaseRepository
export function useOptimizedPagination<T>(
  baseUrl: string,
  initialConfig: PaginationConfig = {}
) {
  const {
    defaultLimit = 20,
    maxLimit = 100,
    preloadPages = 2,
    enableInfiniteScroll = false,
    virtualScrolling = false,
    debounceMs = 300,
    ...cacheConfig
  } = initialConfig;

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const [sorts, setSorts] = useState<SortOption[]>([]);
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [allData, setAllData] = useState<T[]>([]); // For infinite scroll
  
  // Refs for optimization
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const preloadCacheRef = useRef<Set<number>>(new Set());
  const infiniteScrollDataRef = useRef<Map<number, T[]>>(new Map());

  // Generate query parameters for coordinated backend requests
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      page: currentPage,
      limit: Math.min(limit, maxLimit),
    };

    // Add sorting parameters (coordinate with BaseRepository order format)
    if (sorts.length > 0) {
      params.sort = sorts.map(sort => `${sort.field}:${sort.direction}`).join(',');
    }

    // Add filter parameters (coordinate with BaseRepository where format)
    if (filters.length > 0) {
      params.filters = JSON.stringify(
        filters.reduce((acc, filter) => {
          acc[filter.field] = {
            [filter.operator || 'eq']: filter.value
          };
          return acc;
        }, {} as Record<string, any>)
      );
    }

    // Add search parameter
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    return params;
  }, [currentPage, limit, sorts, filters, searchTerm, maxLimit]);

  // Main data fetching with coordinated caching
  const {
    data: paginationResult,
    isLoading,
    error,
    lastUpdated,
    refresh,
    forceRefresh,
    cacheMetrics
  } = useCachedAPI<PaginationResult<T>>(
    baseUrl,
    queryParams,
    {
      ttl: 2 * 60 * 1000, // 2 minutes for paginated data
      staleWhileRevalidate: true,
      backgroundRefresh: true,
      backgroundRefreshThreshold: 0.7,
      ...cacheConfig
    }
  );

  // Preload adjacent pages for better UX
  const preloadAdjacentPages = useCallback(async () => {
    if (!paginationResult) return;

    const { pagination } = paginationResult;
    const pagesToPreload: number[] = [];

    // Determine which pages to preload
    for (let i = 1; i <= preloadPages; i++) {
      const nextPage = currentPage + i;
      const prevPage = currentPage - i;

      if (nextPage <= pagination.totalPages && !preloadCacheRef.current.has(nextPage)) {
        pagesToPreload.push(nextPage);
      }
      if (prevPage >= 1 && !preloadCacheRef.current.has(prevPage)) {
        pagesToPreload.push(prevPage);
      }
    }

    // Preload pages in background
    pagesToPreload.forEach(async (page) => {
      try {
        preloadCacheRef.current.add(page);
        
        const preloadParams = { ...queryParams, page };
        await fetch(`${baseUrl}?${new URLSearchParams(preloadParams).toString()}`, {
          headers: {
            'Cache-Control': 'stale-while-revalidate=300',
          },
        });
      } catch (error) {
        console.warn(`Failed to preload page ${page}:`, error);
        preloadCacheRef.current.delete(page);
      }
    });
  }, [baseUrl, currentPage, queryParams, paginationResult, preloadPages]);

  // Update infinite scroll data when new data arrives
  useEffect(() => {
    if (!enableInfiniteScroll || !paginationResult) return;

    infiniteScrollDataRef.current.set(currentPage, paginationResult.data);
    
    // Rebuild allData from cached pages in order
    const newAllData: T[] = [];
    for (let page = 1; page <= currentPage; page++) {
      const pageData = infiniteScrollDataRef.current.get(page);
      if (pageData) {
        newAllData.push(...pageData);
      }
    }
    setAllData(newAllData);
  }, [enableInfiniteScroll, paginationResult, currentPage]);

  // Trigger preloading when data changes
  useEffect(() => {
    if (paginationResult && preloadPages > 0) {
      // Small delay to avoid blocking main thread
      setTimeout(preloadAdjacentPages, 100);
    }
  }, [paginationResult, preloadAdjacentPages, preloadPages]);

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    if (page < 1 || (paginationResult && page > paginationResult.pagination.totalPages)) {
      return;
    }
    setCurrentPage(page);
  }, [paginationResult]);

  const nextPage = useCallback(() => {
    if (paginationResult?.pagination.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [paginationResult]);

  const previousPage = useCallback(() => {
    if (paginationResult?.pagination.hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [paginationResult]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    if (paginationResult) {
      setCurrentPage(paginationResult.pagination.totalPages);
    }
  }, [paginationResult]);

  // Infinite scroll function
  const loadNextPage = useCallback(async () => {
    if (!enableInfiniteScroll || !paginationResult?.pagination.hasNextPage || isLoading) {
      return false;
    }

    try {
      setCurrentPage(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('Failed to load next page:', error);
      return false;
    }
  }, [enableInfiniteScroll, paginationResult, isLoading]);

  // Sorting functions
  const addSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSorts(prev => {
      const existing = prev.findIndex(sort => sort.field === field);
      if (existing >= 0) {
        const newSorts = [...prev];
        newSorts[existing] = { field, direction };
        return newSorts;
      }
      return [...prev, { field, direction }];
    });
    setCurrentPage(1); // Reset to first page when sorting changes
  }, []);

  const removeSort = useCallback((field: string) => {
    setSorts(prev => prev.filter(sort => sort.field !== field));
    setCurrentPage(1);
  }, []);

  const clearSorts = useCallback(() => {
    setSorts([]);
    setCurrentPage(1);
  }, []);

  // Filtering functions with debouncing
  const addFilter = useCallback((field: string, value: any, operator: FilterOption['operator'] = 'eq') => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setFilters(prev => {
        const existing = prev.findIndex(filter => filter.field === field);
        if (existing >= 0) {
          const newFilters = [...prev];
          newFilters[existing] = { field, value, operator };
          return newFilters;
        }
        return [...prev, { field, value, operator }];
      });
      setCurrentPage(1);
    }, debounceMs);
  }, [debounceMs]);

  const removeFilter = useCallback((field: string) => {
    setFilters(prev => prev.filter(filter => filter.field !== field));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
    setCurrentPage(1);
  }, []);

  // Search function with debouncing
  const updateSearch = useCallback((term: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchTerm(term);
      setCurrentPage(1);
    }, debounceMs);
  }, [debounceMs]);

  // Limit change function
  const changeLimit = useCallback((newLimit: number) => {
    const clampedLimit = Math.min(newLimit, maxLimit);
    setLimit(clampedLimit);
    setCurrentPage(1);
    
    // Clear infinite scroll data when limit changes
    if (enableInfiniteScroll) {
      infiniteScrollDataRef.current.clear();
      setAllData([]);
    }
  }, [maxLimit, enableInfiniteScroll]);

  // Reset function
  const reset = useCallback(() => {
    setCurrentPage(1);
    setLimit(defaultLimit);
    setSorts([]);
    setFilters([]);
    setSearchTerm('');
    preloadCacheRef.current.clear();
    
    if (enableInfiniteScroll) {
      infiniteScrollDataRef.current.clear();
      setAllData([]);
    }
  }, [defaultLimit, enableInfiniteScroll]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Pagination state object
  const paginationState: PaginationState<T> = {
    currentPage,
    limit,
    total: paginationResult?.pagination.total || 0,
    totalPages: paginationResult?.pagination.totalPages || 0,
    hasNextPage: paginationResult?.pagination.hasNextPage || false,
    hasPrevPage: paginationResult?.pagination.hasPrevPage || false,
    data: enableInfiniteScroll ? allData : (paginationResult?.data || []),
    isLoading,
    error,
    lastUpdated,
    cacheMetrics: {
      hitRatio: cacheMetrics.hitRatio,
      totalRequests: cacheMetrics.totalRequests
    }
  };

  return {
    // State
    ...paginationState,
    sorts,
    filters,
    searchTerm,
    
    // Navigation
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    loadNextPage,
    
    // Configuration
    changeLimit,
    
    // Sorting
    addSort,
    removeSort,
    clearSorts,
    
    // Filtering
    addFilter,
    removeFilter,
    clearFilters,
    
    // Search
    updateSearch,
    
    // Actions
    refresh,
    forceRefresh,
    reset,
    
    // Virtual scrolling helpers
    getVirtualizedData: virtualScrolling ? 
      (startIndex: number, endIndex: number) => 
        paginationState.data.slice(startIndex, endIndex + 1) : 
      undefined
  };
}

export default useOptimizedPagination;