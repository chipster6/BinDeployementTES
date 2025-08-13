'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, Bin, BinStatus, BinType, BinMaterial } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import StatusIndicator from '@/components/ui/status-indicator';
import { Progress } from '@/components/ui/progress';
import { 
  Trash2, 
  Search, 
  Plus, 
  MapPin, 
  Calendar, 
  TrendingUp,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Package,
  Activity
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface BinStats {
  totalBins: number;
  activeBins: number;
  maintenanceBins: number;
  retiredBins: number;
  averageFillLevel: number;
  binsNeedingService: number;
  gpsEnabledBins: number;
  sensorEnabledBins: number;
}

export default function BinsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bins, setBins] = useState<Bin[]>([]);
  const [filteredBins, setFilteredBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BinStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<BinType | 'all'>('all');
  const [stats, setStats] = useState<BinStats>({
    totalBins: 0,
    activeBins: 0,
    maintenanceBins: 0,
    retiredBins: 0,
    averageFillLevel: 0,
    binsNeedingService: 0,
    gpsEnabledBins: 0,
    sensorEnabledBins: 0,
  });

  // Load bins on component mount
  useEffect(() => {
    loadBins();
  }, []);

  // Filter bins based on search, status, and type
  useEffect(() => {
    let filtered = bins;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(bin =>
        bin.binNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bin.size.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bin => bin.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(bin => bin.binType === typeFilter);
    }

    setFilteredBins(filtered);
  }, [bins, searchTerm, statusFilter, typeFilter]);

  const loadBins = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBins();
      
      if (response.success && response.data) {
        setBins(response.data);
        calculateStats(response.data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load bins',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while loading bins',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (binData: Bin[]) => {
    const totalBins = binData.length;
    const activeBins = binData.filter(b => b.status === BinStatus.ACTIVE).length;
    const maintenanceBins = binData.filter(b => b.status === BinStatus.MAINTENANCE).length;
    const retiredBins = binData.filter(b => b.status === BinStatus.RETIRED).length;
    
    const fillLevels = binData
      .filter(b => b.fillLevelPercent !== undefined)
      .map(b => b.fillLevelPercent!);
    
    const averageFillLevel = fillLevels.length > 0 
      ? fillLevels.reduce((sum, level) => sum + level, 0) / fillLevels.length 
      : 0;
    
    const binsNeedingService = binData.filter(b => 
      (b.fillLevelPercent || 0) > 80 || 
      (b.nextServiceDate && new Date(b.nextServiceDate) <= new Date())
    ).length;
    
    const gpsEnabledBins = binData.filter(b => b.gpsEnabled).length;
    const sensorEnabledBins = binData.filter(b => b.sensorEnabled).length;

    setStats({
      totalBins,
      activeBins,
      maintenanceBins,
      retiredBins,
      averageFillLevel,
      binsNeedingService,
      gpsEnabledBins,
      sensorEnabledBins,
    });
  };

  const getStatusIndicator = (status: BinStatus) => {
    switch (status) {
      case BinStatus.ACTIVE:
        return <StatusIndicator status="active" label="Active" size="sm" />;
      case BinStatus.MAINTENANCE:
        return <StatusIndicator status="warning" label="Maintenance" size="sm" />;
      case BinStatus.RETIRED:
        return <StatusIndicator status="inactive" label="Retired" size="sm" />;
      case BinStatus.LOST:
        return <StatusIndicator status="error" label="Lost" size="sm" />;
      default:
        return <StatusIndicator status="inactive" label="Unknown" size="sm" />;
    }
  };

  const getFillLevelColor = (fillLevel: number) => {
    if (fillLevel >= 90) return 'bg-red-500';
    if (fillLevel >= 75) return 'bg-orange-500';
    if (fillLevel >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getFillLevelStatus = (fillLevel: number) => {
    if (fillLevel >= 90) return 'Urgent';
    if (fillLevel >= 75) return 'High';
    if (fillLevel >= 50) return 'Medium';
    return 'Low';
  };

  const formatBinType = (type: BinType) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatMaterial = (material?: BinMaterial) => {
    if (!material) return 'N/A';
    return material.charAt(0).toUpperCase() + material.slice(1);
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between animate-slide-up">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Bin Management</h1>
              <p className="text-lg text-gray-600">Monitor and manage your bin inventory and collection status</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button className="btn-primary-enhanced">
                <Plus className="mr-2 h-4 w-4" />
                Add Bin
              </Button>
              <Button variant="outline">
                <MapPin className="mr-2 h-4 w-4" />
                Map View
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
            <div className="metric-card interactive">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Total
                </div>
              </div>
              <div className="metric-value">{stats.totalBins}</div>
              <div className="metric-label">Total Bins</div>
              <div className="flex items-center space-x-4 mt-2 text-xs">
                <span className="text-green-600">
                  <Activity className="h-3 w-3 inline mr-1" />
                  {stats.gpsEnabledBins} GPS
                </span>
                <span className="text-purple-600">
                  <Zap className="h-3 w-3 inline mr-1" />
                  {stats.sensorEnabledBins} Sensors
                </span>
              </div>
            </div>

            <div className="metric-card interactive">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Active
                </div>
              </div>
              <div className="metric-value">{stats.activeBins}</div>
              <div className="metric-label">Active Bins</div>
              <p className="text-xs text-green-600 font-medium mt-1">
                {stats.totalBins > 0 ? Math.round((stats.activeBins / stats.totalBins) * 100) : 0}% operational
              </p>
            </div>

            <div className="metric-card interactive">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                  Fill Level
                </div>
              </div>
              <div className="metric-value">{Math.round(stats.averageFillLevel)}%</div>
              <div className="metric-label">Average Fill Level</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getFillLevelColor(stats.averageFillLevel)}`}
                  style={{width: `${stats.averageFillLevel}%`}}
                ></div>
              </div>
            </div>

            <div className="metric-card interactive">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  Urgent
                </div>
              </div>
              <div className="metric-value">{stats.binsNeedingService}</div>
              <div className="metric-label">Need Service</div>
              <p className="text-xs text-red-600 font-medium mt-1">
                Require immediate attention
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card-enhanced p-6 animate-fade-in">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search bins by number, size, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as BinStatus | 'all')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="all">All Status</option>
                    <option value={BinStatus.ACTIVE}>Active</option>
                    <option value={BinStatus.MAINTENANCE}>Maintenance</option>
                    <option value={BinStatus.RETIRED}>Retired</option>
                    <option value={BinStatus.LOST}>Lost</option>
                  </select>
                </div>
                
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as BinType | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Types</option>
                  <option value={BinType.DUMPSTER}>Dumpster</option>
                  <option value={BinType.ROLL_OFF}>Roll Off</option>
                  <option value={BinType.COMPACTOR}>Compactor</option>
                  <option value={BinType.RECYCLING}>Recycling</option>
                  <option value={BinType.ORGANIC}>Organic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bin List */}
          <div className="space-y-4 animate-fade-in">
            {loading ? (
              <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="card-enhanced p-6">
                    <div className="animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBins.length === 0 ? (
              <div className="card-enhanced p-12 text-center">
                <Trash2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bins found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your search criteria.' 
                    : 'Get started by adding your first bin.'}
                </p>
                <Button className="btn-primary-enhanced">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bin
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredBins.map((bin) => (
                  <div key={bin.id} className="card-enhanced p-6 interactive">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <Trash2 className="h-6 w-6 text-green-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Bin #{bin.binNumber}
                            </h3>
                            {getStatusIndicator(bin.status)}
                            
                            {/* Fill Level Indicator */}
                            {bin.fillLevelPercent !== undefined && (
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${getFillLevelColor(bin.fillLevelPercent)}`}
                                    style={{width: `${bin.fillLevelPercent}%`}}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium text-gray-600">
                                  {bin.fillLevelPercent}%
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Type:</span> {formatBinType(bin.binType)}
                            </div>
                            <div>
                              <span className="font-medium">Size:</span> {bin.size}
                            </div>
                            {bin.capacityCubicYards && (
                              <div>
                                <span className="font-medium">Capacity:</span> {bin.capacityCubicYards} yd³
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Material:</span> {formatMaterial(bin.material)}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-3">
                            <Badge variant="outline" className="text-xs">
                              {formatBinType(bin.binType)}
                            </Badge>
                            
                            {bin.gpsEnabled && (
                              <div className="flex items-center space-x-1 text-xs text-green-600">
                                <Activity className="h-3 w-3" />
                                <span>GPS Enabled</span>
                              </div>
                            )}
                            
                            {bin.sensorEnabled && (
                              <div className="flex items-center space-x-1 text-xs text-purple-600">
                                <Zap className="h-3 w-3" />
                                <span>Smart Sensor</span>
                              </div>
                            )}
                            
                            {bin.lastServiceDate && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>Last service: {new Date(bin.lastServiceDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MapPin className="mr-2 h-4 w-4" />
                              View Location
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="mr-2 h-4 w-4" />
                              Schedule Service
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}