"use client";

import React, { useMemo, useState, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Search, Filter, ChevronUp, ChevronDown } from 'lucide-react';

export interface VirtualizedTableColumn<T = any> {
  id: string;
  header: string;
  accessor: keyof T | ((item: T) => any);
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

export interface VirtualizedTableProps<T = any> {
  data: T[];
  columns: VirtualizedTableColumn<T>[];
  height?: number;
  rowHeight?: number;
  overscan?: number;
  onRowClick?: (item: T, index: number) => void;
  onLoadMore?: () => Promise<void>;
  hasNextPage?: boolean;
  isLoading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  className?: string;
  emptyMessage?: string;
  loadingMessage?: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const VirtualizedTableRow = memo<{
  item: any;
  columns: VirtualizedTableColumn[];
  index: number;
  onClick?: (item: any, index: number) => void;
}>(({ item, columns, index, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(item, index);
  }, [onClick, item, index]);

  return (
    <div
      className={cn(
        "flex border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-150",
        index % 2 === 0 ? "bg-white" : "bg-gray-25"
      )}
      onClick={handleClick}
      role="row"
      tabIndex={0}
    >
      {columns.map((column) => {
        const value = typeof column.accessor === 'function' 
          ? column.accessor(item) 
          : item[column.accessor];
        
        return (
          <div
            key={column.id}
            className={cn(
              "px-4 py-3 text-sm text-gray-900 flex items-center",
              column.className
            )}
            style={{
              width: column.width || 'auto',
              minWidth: column.minWidth || 120,
              flex: column.width ? undefined : 1
            }}
            role="cell"
          >
            {column.render ? column.render(value, item) : value}
          </div>
        );
      })}
    </div>
  );
});

VirtualizedTableRow.displayName = 'VirtualizedTableRow';

const TableHeader = memo<{
  columns: VirtualizedTableColumn[];
  sortConfig?: SortConfig;
  onSort?: (columnId: string) => void;
}>(({ columns, sortConfig, onSort }) => {
  return (
    <div className="flex bg-gray-100 border-b border-gray-300 sticky top-0 z-10" role="row">
      {columns.map((column) => (
        <div
          key={column.id}
          className={cn(
            "px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider",
            column.sortable && "cursor-pointer hover:bg-gray-200 select-none",
            column.className
          )}
          style={{
            width: column.width || 'auto',
            minWidth: column.minWidth || 120,
            flex: column.width ? undefined : 1
          }}
          onClick={column.sortable ? () => onSort?.(column.id) : undefined}
          role="columnheader"
        >
          <div className="flex items-center space-x-1">
            <span>{column.header}</span>
            {column.sortable && sortConfig?.key === column.id && (
              sortConfig.direction === 'asc' ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

TableHeader.displayName = 'TableHeader';

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  height = 400,
  rowHeight = 60,
  overscan = 5,
  onRowClick,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  searchable = true,
  filterable = true,
  sortable = true,
  className,
  emptyMessage = "No data available",
  loadingMessage = "Loading..."
}: VirtualizedTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>();
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        columns.some((column) => {
          const value = typeof column.accessor === 'function' 
            ? column.accessor(item) 
            : item[column.accessor];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([columnId, filterValue]) => {
      if (filterValue) {
        const column = columns.find(col => col.id === columnId);
        if (column) {
          filtered = filtered.filter((item) => {
            const value = typeof column.accessor === 'function' 
              ? column.accessor(item) 
              : item[column.accessor];
            return String(value).toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      }
    });

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const column = columns.find(col => col.id === sortConfig.key);
        if (!column) return 0;

        const aValue = typeof column.accessor === 'function' 
          ? column.accessor(a) 
          : a[column.accessor];
        const bValue = typeof column.accessor === 'function' 
          ? column.accessor(b) 
          : b[column.accessor];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, filters, columns]);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: processedData.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const handleSort = useCallback((columnId: string) => {
    if (!sortable) return;
    
    setSortConfig((current) => {
      if (current?.key === columnId) {
        return current.direction === 'asc' 
          ? { key: columnId, direction: 'desc' }
          : undefined;
      }
      return { key: columnId, direction: 'asc' };
    });
  }, [sortable]);

  const handleFilterChange = useCallback((columnId: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnId]: value
    }));
  }, []);

  // Load more data when scrolling near the bottom
  React.useEffect(() => {
    const lastItem = virtualizer.getVirtualItems().at(-1);
    
    if (
      lastItem &&
      lastItem.index >= processedData.length - 1 &&
      hasNextPage &&
      !isLoading &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [
    hasNextPage,
    onLoadMore,
    processedData.length,
    isLoading,
    virtualizer
  ]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Data Table</CardTitle>
          <Badge variant="secondary">
            {processedData.length} of {data.length} items
          </Badge>
        </div>
        
        {(searchable || filterable) && (
          <div className="flex flex-col space-y-4">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search across all columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            
            {filterable && (
              <div className="flex flex-wrap gap-2">
                {columns.filter(col => col.filterable !== false).map((column) => (
                  <div key={column.id} className="min-w-32">
                    <Input
                      placeholder={`Filter ${column.header}...`}
                      value={filters[column.id] || ''}
                      onChange={(e) => handleFilterChange(column.id, e.target.value)}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="border rounded-lg overflow-hidden">
          <TableHeader
            columns={columns}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ height }}
            role="table"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {processedData.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  {isLoading ? loadingMessage : emptyMessage}
                </div>
              ) : (
                virtualizer.getVirtualItems().map((virtualItem) => {
                  const isLoader = virtualItem.index >= processedData.length;
                  const item = processedData[virtualItem.index];

                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      {isLoader ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          {isLoading ? "Loading more..." : "Load more"}
                        </div>
                      ) : (
                        <VirtualizedTableRow
                          item={item}
                          columns={columns}
                          index={virtualItem.index}
                          onClick={onRowClick}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default VirtualizedTable;