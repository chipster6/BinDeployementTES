# Frontend Agent Report
## Waste Management System - UI/UX Components and Client-Side Architecture

### Executive Summary
The frontend shows solid React 19.1.1 foundations with modern Next.js patterns, but contains incomplete component implementations and lacks production-ready state management, error handling, and user experience optimizations.

### What's Working Well
- **Modern React Stack**: React 19.1.1 with Next.js 15.4.6 App Router
- **Component Architecture**: Clean separation with reusable UI components using shadcn/ui
- **TypeScript Integration**: Full type safety across frontend components
- **Design System**: TailwindCSS with consistent styling patterns
- **Responsive Layout**: Dashboard layout with sidebar and header navigation
- **Form Structure**: Basic form components with proper HTML semantics
- **Authentication Flow**: Login form with JWT token handling

### Critical Frontend Issues Found
1. **Incomplete Form Implementations**: CustomerForm, BinForm, RouteForm, InvoiceForm contain placeholder comments instead of actual UI
2. **Missing State Management**: No centralized state management for application data
3. **No Error Boundaries**: Missing error handling for component failures
4. **Insufficient Loading States**: No loading indicators or skeleton components
5. **Missing Form Validation**: Frontend validation not implemented for user feedback
6. **No Data Fetching Strategy**: No systematic approach to API calls and caching
7. **Accessibility Issues**: Missing ARIA labels, focus management, and keyboard navigation
8. **No Real-time Updates**: Missing WebSocket or polling for live data updates

### What Needs Changes/Improvements
- Complete all form component implementations with proper UI elements
- Implement comprehensive state management (Zustand or Redux Toolkit)
- Add error boundaries and error handling throughout the application
- Create loading states and skeleton components for better UX
- Implement client-side validation with real-time feedback
- Add accessibility features and ARIA compliance
- Create responsive design optimizations for mobile devices

### What Needs Removal/Replacement
- Remove placeholder comments from form components
- Replace basic fetch calls with proper API client with error handling
- Remove hardcoded data and implement dynamic data fetching
- Replace inline styles with consistent TailwindCSS utilities

### Missing Components
- State management system
- Error boundary components
- Loading and skeleton components
- Toast notification system
- Modal/dialog management
- Data table components with sorting/filtering
- Chart and visualization components
- File upload components
- Date/time picker components
- Search and autocomplete components
- Infinite scroll or pagination components
- Real-time update system

## Step-by-Step Frontend Implementation Guide

### Phase 1: Complete Form Component Implementations (Priority: URGENT)

#### Step 1: Complete Customer Form Component
```bash
# Navigate to customer form component
cd waste-management-system/src/components
nano CustomerForm.tsx
```

**Replace existing placeholder with complete implementation**:
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X } from 'lucide-react';
import { Customer } from '@/types/customer';

// Form validation schema
const customerFormSchema = z.object({
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(200, 'Business name must be less than 200 characters'),
  email: z.string()
    .email('Invalid email address')
    .max(254, 'Email must be less than 254 characters'),
  phone: z.string()
    .regex(/^[\+]?[\d\s\-\(\)]{10,}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must be less than 500 characters'),
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters'),
  state: z.string()
    .min(2, 'State must be at least 2 characters')
    .max(50, 'State must be less than 50 characters'),
  zipCode: z.string()
    .regex(/^[\d-]{5,10}$/, 'Invalid zip code format'),
  serviceType: z.enum(['residential', 'commercial', 'industrial'], {
    required_error: 'Please select a service type',
  }),
  billingCycle: z.enum(['weekly', 'biweekly', 'monthly'], {
    required_error: 'Please select a billing cycle',
  }),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export default function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = '',
}: CustomerFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      businessName: customer?.businessName || '',
      email: customer?.contactInfo?.email || '',
      phone: customer?.contactInfo?.phone || '',
      address: customer?.addressInfo?.address || '',
      city: customer?.addressInfo?.city || '',
      state: customer?.addressInfo?.state || '',
      zipCode: customer?.addressInfo?.zipCode || '',
      serviceType: customer?.serviceType || 'residential',
      billingCycle: customer?.billingCycle || 'monthly',
      notes: customer?.notes || '',
    },
  });

  // Watch for form changes to show unsaved changes warning
  const watchedFields = form.watch();
  useEffect(() => {
    setIsFormDirty(form.formState.isDirty);
  }, [watchedFields, form.formState.isDirty]);

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      setApiError(null);
      await onSubmit(data);
      setIsFormDirty(false);
    } catch (error: any) {
      setApiError(error.message || 'An error occurred while saving the customer');
    }
  };

  const handleCancel = () => {
    if (isFormDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) return;
    }
    onCancel();
  };

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {customer ? 'Edit Customer' : 'Add New Customer'}
          {isFormDirty && (
            <span className="text-sm text-amber-600 font-normal">
              (Unsaved changes)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {apiError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Business Information</h3>
              
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter business name"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="business@example.com"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional contact phone number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address Information</h3>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main Street"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="City"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="State"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12345"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Service Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Service Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Cycle *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select billing cycle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the customer..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional additional information about the customer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {customer ? 'Update Customer' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

#### Step 2: Install Required Dependencies
```bash
# Install form handling and validation dependencies
npm install react-hook-form @hookform/resolvers
npm install lucide-react

# Install additional UI components if not already installed
npm install @radix-ui/react-select @radix-ui/react-textarea
```

#### Step 3: Implement State Management with Zustand
```bash
nano src/stores/customer.store.ts
```

**Add customer state management**:
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Customer } from '@/types/customer';

interface CustomerState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    serviceType: string;
    contractStatus: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface CustomerActions {
  // Data fetching
  fetchCustomers: () => Promise<void>;
  fetchCustomer: (id: string) => Promise<void>;
  
  // CRUD operations
  createCustomer: (customer: Partial<Customer>) => Promise<void>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  
  // UI state management
  setSelectedCustomer: (customer: Customer | null) => void;
  setFilters: (filters: Partial<CustomerState['filters']>) => void;
  setPagination: (pagination: Partial<CustomerState['pagination']>) => void;
  clearError: () => void;
}

type CustomerStore = CustomerState & CustomerActions;

export const useCustomerStore = create<CustomerStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        customers: [],
        selectedCustomer: null,
        loading: false,
        error: null,
        filters: {
          search: '',
          serviceType: '',
          contractStatus: '',
        },
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
        },

        // Actions
        fetchCustomers: async () => {
          set({ loading: true, error: null });
          
          try {
            const { filters, pagination } = get();
            const searchParams = new URLSearchParams({
              page: pagination.page.toString(),
              limit: pagination.limit.toString(),
              ...(filters.search && { search: filters.search }),
              ...(filters.serviceType && { serviceType: filters.serviceType }),
              ...(filters.contractStatus && { contractStatus: filters.contractStatus }),
            });

            const response = await fetch(`/api/customers?${searchParams}`);
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to fetch customers');
            }

            const data = await response.json();
            
            set({
              customers: data.data,
              pagination: {
                ...pagination,
                total: data.pagination.total,
              },
              loading: false,
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        fetchCustomer: async (id: string) => {
          set({ loading: true, error: null });
          
          try {
            const response = await fetch(`/api/customers/${id}`);
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to fetch customer');
            }

            const data = await response.json();
            set({ selectedCustomer: data.data, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        createCustomer: async (customerData: Partial<Customer>) => {
          set({ loading: true, error: null });
          
          try {
            const response = await fetch('/api/customers', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(customerData),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to create customer');
            }

            const data = await response.json();
            
            set(state => ({
              customers: [data.data, ...state.customers],
              loading: false,
            }));

            // Refresh the list to get updated pagination
            await get().fetchCustomers();
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        updateCustomer: async (id: string, customerData: Partial<Customer>) => {
          set({ loading: true, error: null });
          
          try {
            const response = await fetch(`/api/customers/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(customerData),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to update customer');
            }

            const data = await response.json();
            
            set(state => ({
              customers: state.customers.map(customer =>
                customer.id === id ? data.data : customer
              ),
              selectedCustomer: state.selectedCustomer?.id === id ? data.data : state.selectedCustomer,
              loading: false,
            }));
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        deleteCustomer: async (id: string) => {
          set({ loading: true, error: null });
          
          try {
            const response = await fetch(`/api/customers/${id}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to delete customer');
            }

            set(state => ({
              customers: state.customers.filter(customer => customer.id !== id),
              selectedCustomer: state.selectedCustomer?.id === id ? null : state.selectedCustomer,
              loading: false,
            }));
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        setSelectedCustomer: (customer: Customer | null) => {
          set({ selectedCustomer: customer });
        },

        setFilters: (newFilters: Partial<CustomerState['filters']>) => {
          set(state => ({
            filters: { ...state.filters, ...newFilters },
            pagination: { ...state.pagination, page: 1 }, // Reset to first page
          }));
        },

        setPagination: (newPagination: Partial<CustomerState['pagination']>) => {
          set(state => ({
            pagination: { ...state.pagination, ...newPagination },
          }));
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'customer-store',
        partialize: (state) => ({
          filters: state.filters,
          pagination: state.pagination,
        }),
      }
    ),
    {
      name: 'customer-store',
    }
  )
);
```

### Phase 2: Error Boundaries and Loading States (Priority: HIGH)

#### Step 4: Create Error Boundary Component
```bash
nano src/components/ErrorBoundary.tsx
```

**Add error boundary implementation**:
```tsx
'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-muted p-4 rounded-md">
                <h4 className="font-medium mb-2">Error Details:</h4>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
```

#### Step 5: Create Loading Components
```bash
nano src/components/LoadingStates.tsx
```

**Add comprehensive loading components**:
```tsx
import React from 'react';
import { Loader2, Package, Users, Route, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Generic loading spinner
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin`} />
    </div>
  );
};

// Page loading overlay
export const PageLoading: React.FC = () => (
  <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Customer list skeleton
export const CustomerListSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <Card key={i}>
        <CardHeader className="flex flex-row items-center space-y-0 pb-4">
          <div className="flex items-center space-x-4 flex-1">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Dashboard cards skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[
      { icon: Users, title: 'Customers' },
      { icon: Package, title: 'Bins' },
      { icon: Route, title: 'Routes' },
      { icon: FileText, title: 'Invoices' },
    ].map((item, i) => (
      <Card key={i}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <item.icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="border rounded-md">
    {/* Table header */}
    <div className="border-b p-4">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    
    {/* Table rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="border-b last:border-b-0 p-4">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Form skeleton
export const FormSkeleton: React.FC = () => (
  <Card className="w-full max-w-2xl mx-auto">
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-32" />
      </div>
    </CardContent>
  </Card>
);
```

### Phase 3: Toast Notifications and Modal Management (Priority: MEDIUM)

#### Step 6: Create Toast Notification System
```bash
nano src/components/ui/toast.tsx
```

**Add toast notification component**:
```tsx
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast component
const ToastComponent: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  const { id, type, title, description, action } = toast;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = icons[type];

  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={cn(
      'relative flex w-full items-center space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
      'animate-in slide-in-from-top-full duration-300',
      typeClasses[type]
    )}>
      <Icon className="h-4 w-4" />
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium leading-none">{title}</div>
        {description && (
          <div className="text-sm opacity-90">{description}</div>
        )}
      </div>
      {action && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-2 text-xs"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-auto p-1 text-foreground/50 hover:text-foreground"
        onClick={() => onRemove(id)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

// Toast container
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-2">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
};

// Toast provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Utility hooks for common toast types
export const useToastUtils = () => {
  const { addToast } = useToast();

  return {
    success: (title: string, description?: string) =>
      addToast({ type: 'success', title, description }),
    error: (title: string, description?: string) =>
      addToast({ type: 'error', title, description }),
    warning: (title: string, description?: string) =>
      addToast({ type: 'warning', title, description }),
    info: (title: string, description?: string) =>
      addToast({ type: 'info', title, description }),
  };
};
```

### Phase 4: Enhanced Customer Page Implementation (Priority: MEDIUM)

#### Step 7: Update Customer Page with New Components
```bash
nano src/app/(dashboard)/customers/page.tsx
```

**Replace with enhanced implementation**:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CustomerListSkeleton } from '@/components/LoadingStates';
import CustomerForm from '@/components/CustomerForm';
import { useCustomerStore } from '@/stores/customer.store';
import { useToastUtils } from '@/components/ui/toast';
import { Customer } from '@/types/customer';

export default function CustomersPage() {
  return (
    <ErrorBoundary>
      <CustomersPageContent />
    </ErrorBoundary>
  );
}

function CustomersPageContent() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    customers,
    loading,
    error,
    filters,
    pagination,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    setFilters,
    setPagination,
    clearError,
  } = useCustomerStore();

  const { success, error: showError } = useToastUtils();

  // Fetch customers on component mount and when filters change
  useEffect(() => {
    fetchCustomers();
  }, [filters, pagination.page, fetchCustomers]);

  // Handle search with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setFilters({ search: searchTerm });
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, setFilters]);

  const handleCreateCustomer = async (data: any) => {
    try {
      await createCustomer(data);
      setIsCreateModalOpen(false);
      success('Customer created successfully');
    } catch (error: any) {
      showError('Failed to create customer', error.message);
      throw error; // Re-throw to handle in form
    }
  };

  const handleUpdateCustomer = async (data: any) => {
    if (!selectedCustomer) return;
    
    try {
      await updateCustomer(selectedCustomer.id, data);
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      success('Customer updated successfully');
    } catch (error: any) {
      showError('Failed to update customer', error.message);
      throw error; // Re-throw to handle in form
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.businessName}?`)) {
      return;
    }

    try {
      await deleteCustomer(customer.id);
      success('Customer deleted successfully');
    } catch (error: any) {
      showError('Failed to delete customer', error.message);
    }
  };

  const getContractStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button onClick={fetchCustomers} variant="outline">
                Try Again
              </Button>
              <Button onClick={clearError} variant="ghost">
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer base and service agreements
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer account and service agreement
              </DialogDescription>
            </DialogHeader>
            <CustomerForm
              onSubmit={handleCreateCustomer}
              onCancel={() => setIsCreateModalOpen(false)}
              isSubmitting={loading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.serviceType}
              onValueChange={(value) => setFilters({ serviceType: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.contractStatus}
              onValueChange={(value) => setFilters({ contractStatus: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Contract Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      {loading ? (
        <CustomerListSkeleton />
      ) : (
        <div className="space-y-4">
          {customers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No customers found</p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Customer
                </Button>
              </CardContent>
            </Card>
          ) : (
            customers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {customer.businessName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{customer.businessName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {customer.contactInfo?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getContractStatusColor(customer.contractStatus)}>
                      {customer.contractStatus}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteCustomer(customer)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Service Type</p>
                      <p className="font-medium capitalize">{customer.serviceType}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bins</p>
                      <p className="font-medium">{customer._count?.bins || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center space-x-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({ page: pagination.page - 1 })}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination({ page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Customer Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information and service details
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <CustomerForm
              customer={selectedCustomer}
              onSubmit={handleUpdateCustomer}
              onCancel={() => {
                setIsEditModalOpen(false);
                setSelectedCustomer(null);
              }}
              isSubmitting={loading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### Testing and Validation

#### Step 8: Test Frontend Components
```bash
# Install additional dependencies
npm install zustand

# Test component rendering
npm run dev

# Access the application
open http://localhost:3000/customers

# Test form validation
# - Try submitting empty form
# - Test email validation
# - Test phone number format
# - Test required field validation

# Test state management
# - Create new customer
# - Edit existing customer  
# - Delete customer
# - Test search and filtering

# Test error handling
# - Disconnect network and try operations
# - Test form validation errors
# - Test API error responses
```

This comprehensive frontend implementation provides a modern, accessible, and user-friendly interface with proper error handling, loading states, and state management suitable for production use.