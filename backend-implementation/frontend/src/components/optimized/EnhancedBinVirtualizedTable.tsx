"use client";

import React, { useMemo, useState, useCallback, memo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { 
  Search, Filter, ChevronUp, ChevronDown, MapPin, 
  Trash2, AlertTriangle, CheckCircle, Clock, RefreshCw 
} from 'lucide-react';
import { useOptimizedWebSocket } from '@/hooks/useOptimizedWebSocket';

export interface BinData {
  id: string;
  serialNumber: string;
  type: 'recycling' | 'compost' | 'trash' | 'hazardous';
  capacity: number;
  currentLevel: number;
  fillPercentage: number;
  status: 'normal' | 'full' | 'overflowing' | 'needs_service' | 'damaged';
  lastCollection: string;
  nextScheduledCollection: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    zone: string;
  };
  customer: {
    id: string;
    name: string;
    type: 'residential' | 'commercial' | 'industrial';
  };
  sensor: {
    batteryLevel: number;
    signalStrength: number;
    lastReading: string;
    temperature?: number;
  };
  maintenance: {
    lastService: string;
    nextService: string;
    issuesCount: number;
  };
}

export interface EnhancedBinVirtualizedTableProps {
  data: BinData[];
  height?: number;
  rowHeight?: number;
  overscan?: number;
  onRowClick?: (bin: BinData, index: number) => void;
  onLoadMore?: () => Promise<void>;
  hasNextPage?: boolean;
  isLoading?: boolean;
  className?: string;
  onBinAction?: (action: string, binId: string) => void;
  enableRealTimeUpdates?: boolean;
  filterPresets?: Record<string, any>;
}

const BinStatusIcon = memo<{ status: BinData['status'] }>(({ status }) => {
  const iconMap = {
    normal: <CheckCircle className="h-4 w-4 text-green-500" />,
    full: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    overflowing: <AlertTriangle className="h-4 w-4 text-red-500" />,
    needs_service: <Clock className="h-4 w-4 text-yellow-500" />,
    damaged: <AlertTriangle className="h-4 w-4 text-red-600" />
  };
  return iconMap[status];
});

BinStatusIcon.displayName = 'BinStatusIcon';

const BinTypeIcon = memo<{ type: BinData['type'] }>(({ type }) => {
  const iconMap = {
    recycling: <RefreshCw className="h-4 w-4 text-blue-500" />,
    compost: <Trash2 className="h-4 w-4 text-green-600" />,
    trash: <Trash2 className="h-4 w-4 text-gray-600" />,
    hazardous: <AlertTriangle className="h-4 w-4 text-red-500" />
  };
  return iconMap[type];
});

BinTypeIcon.displayName = 'BinTypeIcon';

const EnhancedBinRow = memo<{
  bin: BinData;
  index: number;
  onClick?: (bin: BinData, index: number) => void;
  onAction?: (action: string, binId: string) => void;
}>(({ bin, index, onClick, onAction }) => {
  const handleClick = useCallback(() => {
    onClick?.(bin, index);
  }, [onClick, bin, index]);

  const handleScheduleCollection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAction?.('schedule_collection', bin.id);
  }, [onAction, bin.id]);

  const handleViewLocation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAction?.('view_location', bin.id);
  }, [onAction, bin.id]);

  const getStatusColor = (status: BinData['status']) => {
    const colorMap = {
      normal: 'bg-green-100 text-green-800',
      full: 'bg-orange-100 text-orange-800',
      overflowing: 'bg-red-100 text-red-800',
      needs_service: 'bg-yellow-100 text-yellow-800',
      damaged: 'bg-red-200 text-red-900'
    };
    return colorMap[status];
  };

  const getFillLevelColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const isUrgent = bin.fillPercentage >= 90 || bin.status === 'overflowing' || bin.status === 'damaged';

  return (
    <div
      className={cn(
        "flex border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-all duration-150",
        index % 2 === 0 ? "bg-white" : "bg-gray-25",
        isUrgent && "border-l-4 border-l-red-500 bg-red-50"
      )}
      onClick={handleClick}
      role="row"
      tabIndex={0}
    >
      {/* Bin ID & Type */}
      <div className="px-4 py-3 text-sm text-gray-900 flex items-center space-x-2 min-w-48">
        <BinTypeIcon type={bin.type} />
        <div>
          <div className="font-medium">{bin.serialNumber}</div>
          <div className="text-xs text-gray-500 capitalize">{bin.type}</div>
        </div>
      </div>

      {/* Fill Level & Status */}
      <div className="px-4 py-3 text-sm min-w-48">
        <div className="flex items-center space-x-2 mb-1">
          <BinStatusIcon status={bin.status} />
          <Badge className={cn("text-xs", getStatusColor(bin.status))}>
            {bin.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Progress 
            value={bin.fillPercentage} 
            className="w-20 h-2"
            style={{
              background: getFillLevelColor(bin.fillPercentage)
            }}
          />
          <span className="text-xs font-medium">{bin.fillPercentage}%</span>
        </div>
      </div>

      {/* Location */}
      <div className="px-4 py-3 text-sm min-w-64 flex-1">
        <div className="flex items-center space-x-1 mb-1">
          <MapPin className="h-3 w-3 text-gray-400" />
          <span className="font-medium">{bin.customer.name}</span>
        </div>
        <div className="text-xs text-gray-500">{bin.location.address}</div>
        <div className="text-xs text-gray-400">Zone: {bin.location.zone}</div>
      </div>

      {/* Collection Info */}
      <div className="px-4 py-3 text-sm min-w-48">
        <div className="text-xs text-gray-500 mb-1">Last: {new Date(bin.lastCollection).toLocaleDateString()}</div>
        <div className="text-xs text-gray-700">Next: {new Date(bin.nextScheduledCollection).toLocaleDateString()}</div>
      </div>

      {/* Sensor Status */}
      <div className="px-4 py-3 text-sm min-w-32">
        <div className="flex items-center space-x-1 mb-1">
          <div className={cn(
            "w-2 h-2 rounded-full",
            bin.sensor.batteryLevel > 20 ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-xs">{bin.sensor.batteryLevel}%</span>
        </div>
        <div className="text-xs text-gray-500">
          Signal: {bin.sensor.signalStrength}%
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 text-sm min-w-40 flex items-center space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleScheduleCollection}
          className="text-xs h-7"
          disabled={bin.status === 'damaged'}
        >
          Schedule
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleViewLocation}
          className="text-xs h-7 p-1"
        >
          <MapPin className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
});

EnhancedBinRow.displayName = 'EnhancedBinRow';

const TableHeader = memo(() => {
  return (
    <div className="flex bg-gray-100 border-b border-gray-300 sticky top-0 z-10 font-medium text-xs text-gray-700 uppercase tracking-wider">
      <div className="px-4 py-3 min-w-48">Bin Details</div>
      <div className="px-4 py-3 min-w-48">Fill Level & Status</div>
      <div className="px-4 py-3 min-w-64 flex-1">Location & Customer</div>
      <div className="px-4 py-3 min-w-48">Collection Schedule</div>
      <div className="px-4 py-3 min-w-32">Sensor Status</div>
      <div className="px-4 py-3 min-w-40">Actions</div>
    </div>
  );
});

TableHeader.displayName = 'TableHeader';

export function EnhancedBinVirtualizedTable({
  data,
  height = 600,
  rowHeight = 80,
  overscan = 10,
  onRowClick,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  className,
  onBinAction,
  enableRealTimeUpdates = true,
  filterPresets
}: EnhancedBinVirtualizedTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [realTimeData, setRealTimeData] = useState<BinData[]>(data);

  // WebSocket for real-time updates
  const { lastMessage, isConnected, sendMessage } = useOptimizedWebSocket({
    url: `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/bins`,
    batchSize: 20,
    batchTimeout: 100,
    onMessage: (message) => {
      if (message.type === 'bin_update' && enableRealTimeUpdates) {
        const updatedBin = message.payload as BinData;
        setRealTimeData(prevData => 
          prevData.map(bin => bin.id === updatedBin.id ? updatedBin : bin)
        );
      }
    },
    onBatchMessage: (messages) => {
      if (enableRealTimeUpdates) {
        const binUpdates = messages
          .filter(msg => msg.type === 'bin_update')
          .map(msg => msg.payload as BinData);
        
        if (binUpdates.length > 0) {
          setRealTimeData(prevData => {
            const updates = new Map(binUpdates.map(bin => [bin.id, bin]));
            return prevData.map(bin => updates.get(bin.id) || bin);
          });
        }
      }
    }
  });

  // Update real-time data when props change
  useEffect(() => {
    setRealTimeData(data);
  }, [data]);

  // Memoized filtered and sorted data with performance optimization
  const processedData = useMemo(() => {
    let filtered = [...realTimeData];

    // Apply urgent filter first (most selective)
    if (urgentOnly) {
      filtered = filtered.filter(bin => 
        bin.fillPercentage >= 90 || 
        bin.status === 'overflowing' || 
        bin.status === 'damaged'
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bin => bin.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(bin => bin.type === typeFilter);
    }

    // Apply search filter (most expensive, do last)
    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(bin =>
        bin.serialNumber.toLowerCase().includes(lowercaseSearch) ||
        bin.customer.name.toLowerCase().includes(lowercaseSearch) ||
        bin.location.address.toLowerCase().includes(lowercaseSearch) ||
        bin.location.zone.toLowerCase().includes(lowercaseSearch)
      );
    }

    // Sort by priority: urgent items first, then by fill percentage descending
    filtered.sort((a, b) => {
      const aUrgent = a.fillPercentage >= 90 || a.status === 'overflowing' || a.status === 'damaged';
      const bUrgent = b.fillPercentage >= 90 || b.status === 'overflowing' || b.status === 'damaged';
      
      if (aUrgent !== bUrgent) {
        return bUrgent ? 1 : -1;
      }
      
      return b.fillPercentage - a.fillPercentage;
    });

    return filtered;
  }, [realTimeData, searchTerm, statusFilter, typeFilter, urgentOnly]);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: processedData.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  // Load more data when scrolling near the bottom
  useEffect(() => {
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

  // Calculate statistics
  const stats = useMemo(() => {
    const total = realTimeData.length;
    const urgent = realTimeData.filter(bin => 
      bin.fillPercentage >= 90 || bin.status === 'overflowing' || bin.status === 'damaged'
    ).length;
    const needsCollection = realTimeData.filter(bin => bin.fillPercentage >= 75).length;
    const offline = realTimeData.filter(bin => bin.sensor.batteryLevel <= 10).length;

    return { total, urgent, needsCollection, offline };
  }, [realTimeData]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5" />
            <span>Bin Management System</span>
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                Live Updates
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-4 text-sm">
            <Badge variant="secondary">
              {processedData.length} of {stats.total} bins
            </Badge>
            {stats.urgent > 0 && (
              <Badge variant="destructive">
                {stats.urgent} urgent
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-blue-500">Total Bins</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{stats.urgent}</div>
            <div className="text-xs text-red-500">Urgent Action</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">{stats.needsCollection}</div>
            <div className="text-xs text-orange-500">Needs Collection</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-600">{stats.offline}</div>
            <div className="text-xs text-gray-500">Low Battery</div>
          </div>
        </div>
        
        {/* Enhanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bins, customers, locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="full">Full</SelectItem>
              <SelectItem value="overflowing">Overflowing</SelectItem>
              <SelectItem value="needs_service">Needs Service</SelectItem>
              <SelectItem value="damaged">Damaged</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="recycling">Recycling</SelectItem>
              <SelectItem value="compost">Compost</SelectItem>
              <SelectItem value="trash">Trash</SelectItem>
              <SelectItem value="hazardous">Hazardous</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={urgentOnly ? "default" : "outline"}
            onClick={() => setUrgentOnly(!urgentOnly)}
            className="w-full"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Urgent Only
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setTypeFilter('all');
              setUrgentOnly(false);
            }}
            className="w-full"
          >
            Clear Filters
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="border rounded-lg overflow-hidden">
          <TableHeader />
          
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
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Trash2 className="h-12 w-12 mb-4 text-gray-300" />
                  <div className="text-lg font-medium">
                    {isLoading ? "Loading bins..." : "No bins found"}
                  </div>
                  <div className="text-sm">
                    {isLoading ? "Please wait while we fetch bin data." : "Try adjusting your filters."}
                  </div>
                </div>
              ) : (
                virtualizer.getVirtualItems().map((virtualItem) => {
                  const isLoader = virtualItem.index >= processedData.length;
                  const bin = processedData[virtualItem.index];

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
                          {isLoading ? "Loading more bins..." : "Load more"}
                        </div>
                      ) : (
                        <EnhancedBinRow
                          bin={bin}
                          index={virtualItem.index}
                          onClick={onRowClick}
                          onAction={onBinAction}
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

export default EnhancedBinVirtualizedTable;