'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, Customer, CustomerStatus, ServiceType, BillingCycle } from '@/lib/types';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import StatusIndicator from '@/components/ui/status-indicator';
import { 
  Users, 
  Search, 
  Plus, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Calendar,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Download
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  pendingCustomers: number;
  totalRevenue: number;
  averageContractValue: number;
}

export default function CustomersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all');
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    inactiveCustomers: 0,
    pendingCustomers: 0,
    totalRevenue: 0,
    averageContractValue: 0,
  });

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers based on search and status
  useEffect(() => {
    let filtered = customers;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.billingAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, statusFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCustomers();
      
      if (response.success && response.data) {
        setCustomers(response.data);
        calculateStats(response.data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load customers',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while loading customers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (customerData: Customer[]) => {
    const totalCustomers = customerData.length;
    const activeCustomers = customerData.filter(c => c.status === CustomerStatus.ACTIVE).length;
    const inactiveCustomers = customerData.filter(c => c.status === CustomerStatus.INACTIVE).length;
    const pendingCustomers = customerData.filter(c => c.status === CustomerStatus.PENDING).length;
    
    // Mock calculations for revenue
    const totalRevenue = customerData
      .filter(c => c.status === CustomerStatus.ACTIVE)
      .reduce((sum, customer) => sum + (customer.accountBalance || 0), 0);
    
    const averageContractValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

    setStats({
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      pendingCustomers,
      totalRevenue,
      averageContractValue,
    });
  };

  const getStatusIndicator = (status: CustomerStatus) => {
    switch (status) {
      case CustomerStatus.ACTIVE:
        return <StatusIndicator status="active" label="Active" size="sm" />;
      case CustomerStatus.INACTIVE:
        return <StatusIndicator status="inactive" label="Inactive" size="sm" />;
      case CustomerStatus.SUSPENDED:
        return <StatusIndicator status="error" label="Suspended" size="sm" />;
      case CustomerStatus.PENDING:
        return <StatusIndicator status="warning" label="Pending" size="sm" />;
      default:
        return <StatusIndicator status="inactive" label="Unknown" size="sm" />;
    }
  };

  const formatServiceType = (serviceType: ServiceType) => {
    return serviceType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatBillingCycle = (cycle: BillingCycle) => {
    return cycle.charAt(0).toUpperCase() + cycle.slice(1);
  };

  // Check if user has permission to view this page
  const canViewCustomers = user && [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.OFFICE_STAFF,
    UserRole.DISPATCHER
  ].includes(user.role);

  if (!canViewCustomers) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-gray-600">You don't have permission to view customers.</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between animate-slide-up">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Customer Management</h1>
              <p className="text-lg text-gray-600">Manage your customer base and service agreements</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button className="btn-primary-enhanced">
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
            <div className="metric-card interactive">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Total
                </div>
              </div>
              <div className="metric-value">{stats.totalCustomers}</div>
              <div className="metric-label">Total Customers</div>
            </div>

            <div className="metric-card interactive">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  Active
                </div>
              </div>
              <div className="metric-value">{stats.activeCustomers}</div>
              <div className="metric-label">Active Customers</div>
              <p className="text-xs text-green-600 font-medium mt-1">
                {stats.totalCustomers > 0 ? Math.round((stats.activeCustomers / stats.totalCustomers) * 100) : 0}% of total
              </p>
            </div>

            <div className="metric-card interactive">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                  Revenue
                </div>
              </div>
              <div className="metric-value">${stats.totalRevenue.toLocaleString()}</div>
              <div className="metric-label">Total Revenue</div>
              <p className="text-xs text-gray-500 mt-1">From active customers</p>
            </div>

            <div className="metric-card interactive">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                  Average
                </div>
              </div>
              <div className="metric-value">${Math.round(stats.averageContractValue).toLocaleString()}</div>
              <div className="metric-label">Avg Contract Value</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card-enhanced p-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customers by name, email, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Status</option>
                  <option value={CustomerStatus.ACTIVE}>Active</option>
                  <option value={CustomerStatus.INACTIVE}>Inactive</option>
                  <option value={CustomerStatus.SUSPENDED}>Suspended</option>
                  <option value={CustomerStatus.PENDING}>Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer List */}
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
            ) : filteredCustomers.length === 0 ? (
              <div className="card-enhanced p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search criteria.' 
                    : 'Get started by adding your first customer.'}
                </p>
                <Button className="btn-primary-enhanced">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="card-enhanced p-6 interactive">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {customer.organizationName}
                            </h3>
                            {getStatusIndicator(customer.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            {customer.contactEmail && (
                              <div className="flex items-center space-x-1">
                                <Mail className="h-4 w-4" />
                                <span>{customer.contactEmail}</span>
                              </div>
                            )}
                            {customer.contactPhone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-4 w-4" />
                                <span>{customer.contactPhone}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{customer.billingAddress}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {formatServiceType(customer.serviceType)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {formatBillingCycle(customer.billingCycle)}
                            </Badge>
                            {customer.accountBalance && (
                              <span className="text-xs text-gray-500">
                                Balance: ${customer.accountBalance.toLocaleString()}
                              </span>
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
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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