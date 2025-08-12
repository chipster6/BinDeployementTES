/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - FRONTEND ERROR BOUNDARY PATTERNS
 * ============================================================================
 *
 * Frontend error boundary patterns and component specifications for React
 * applications. Provides reusable error handling components and patterns
 * that integrate with the backend error handling system.
 *
 * Features:
 * - React error boundary components
 * - Error fallback UI patterns
 * - Recovery mechanism implementations
 * - User-friendly error displays
 * - Integration with backend error system
 * - Accessibility-compliant error handling
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-12
 * Version: 1.0.0
 */

import {
  UserFriendlyError,
  ErrorAction,
  FrontendErrorBoundary,
} from "@/types/ErrorHandling";

/**
 * Error boundary component specification
 */
interface ErrorBoundaryConfig {
  name: string;
  description: string;
  level: "page" | "section" | "component" | "feature";
  fallbackComponent: string;
  reportToBackend: boolean;
  retryEnabled: boolean;
  maxRetries: number;
  autoRecover: boolean;
  userNotification: boolean;
  persistState: boolean;
}

/**
 * Error fallback component specification
 */
interface ErrorFallbackSpec {
  name: string;
  component: string;
  props: Record<string, any>;
  styling: {
    theme: "light" | "dark" | "auto";
    size: "small" | "medium" | "large" | "fullscreen";
    variant: "minimal" | "detailed" | "branded";
  };
  actions: ErrorAction[];
  accessibility: {
    ariaLabel: string;
    focusManagement: boolean;
    announceToScreenReader: boolean;
  };
}

/**
 * React Error Boundary Component Pattern
 */
export const ReactErrorBoundaryPattern = `
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { crossStreamErrorCoordinator } from '@/services/CrossStreamErrorCoordinator';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'section' | 'component';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  retryEnabled?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId?: string;
}

class WasteManagementErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', onError } = this.props;
    
    // Report to backend error system
    try {
      const errorId = await crossStreamErrorCoordinator.reportError(
        error,
        {
          stream: 'frontend',
          component: this.constructor.name,
          operation: 'render',
          userId: this.getUserId(),
          sessionId: this.getSessionId(),
        },
        {
          level,
          componentStack: errorInfo.componentStack,
          errorBoundary: this.constructor.name,
        }
      );

      this.setState({
        errorInfo,
        errorId,
      });
    } catch (reportingError) {
      console.error('Failed to report error to backend:', reportingError);
    }

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary Caught:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  retry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  render() {
    if (this.state.hasError) {
      const { fallback, retryEnabled = true, level = 'component' } = this.props;
      
      if (fallback) {
        return fallback;
      }

      return (
        <ErrorFallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          level={level}
          retryEnabled={retryEnabled && this.state.retryCount < (this.props.maxRetries || 3)}
          onRetry={this.retry}
          retryCount={this.state.retryCount}
        />
      );
    }

    return this.props.children;
  }

  private getUserId(): string | undefined {
    // Implementation to get user ID from context/state
    return undefined;
  }

  private getSessionId(): string | undefined {
    // Implementation to get session ID
    return undefined;
  }
}

export default WasteManagementErrorBoundary;
`;

/**
 * Error Fallback Component Pattern
 */
export const ErrorFallbackComponentPattern = `
import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, Phone, Mail } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: any;
  errorId?: string;
  level: 'page' | 'section' | 'component';
  retryEnabled: boolean;
  onRetry: () => void;
  retryCount: number;
}

const ErrorFallbackComponent: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  level,
  retryEnabled,
  onRetry,
  retryCount,
}) => {
  const [userMessage, setUserMessage] = useState<string>('');
  const [actions, setActions] = useState<ErrorAction[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Fetch user-friendly error message from backend
    fetchUserFriendlyError();
  }, [error, errorId]);

  const fetchUserFriendlyError = async () => {
    try {
      // This would call the backend to get user-friendly error info
      const response = await fetch(\`/api/errors/\${errorId}/user-friendly\`);
      const data = await response.json();
      
      setUserMessage(data.message);
      setActions(data.actions || []);
    } catch (err) {
      setUserMessage(getDefaultMessage());
      setActions(getDefaultActions());
    }
  };

  const getDefaultMessage = (): string => {
    switch (level) {
      case 'page':
        return 'We\\'re having trouble loading this page. Please try refreshing or contact support if the problem continues.';
      case 'section':
        return 'This section is temporarily unavailable. Other parts of the application should still work normally.';
      case 'component':
        return 'A component failed to load properly. You can try refreshing or continue using other features.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const getDefaultActions = (): ErrorAction[] => {
    const defaultActions: ErrorAction[] = [];

    if (retryEnabled) {
      defaultActions.push({
        label: 'Try Again',
        action: 'retry',
        primary: true,
      });
    }

    if (level === 'page') {
      defaultActions.push({
        label: 'Go Home',
        action: 'navigate',
        target: '/',
      });
    }

    defaultActions.push({
      label: 'Contact Support',
      action: 'contact',
      target: 'support@company.com',
    });

    return defaultActions;
  };

  const handleAction = (action: ErrorAction) => {
    switch (action.action) {
      case 'retry':
        onRetry();
        break;
      case 'refresh':
        window.location.reload();
        break;
      case 'navigate':
        window.location.href = action.target || '/';
        break;
      case 'contact':
        if (action.target) {
          window.location.href = \`mailto:\${action.target}?subject=Error Report&body=Error ID: \${errorId}\\nDetails: \${error?.message}\`;
        }
        break;
      case 'dismiss':
        // For component-level errors, could hide the error boundary
        break;
      default:
        console.log('Custom action:', action.handler, action.params);
    }
  };

  const getSeverityColor = () => {
    switch (level) {
      case 'page': return 'text-red-600';
      case 'section': return 'text-yellow-600';
      case 'component': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityBg = () => {
    switch (level) {
      case 'page': return 'bg-red-50';
      case 'section': return 'bg-yellow-50';
      case 'component': return 'bg-blue-50';
      default: return 'bg-gray-50';
    }
  };

  return (
    <div 
      className={\`error-boundary-fallback \${getSeverityBg()} border border-gray-200 rounded-lg p-6 max-w-2xl mx-auto my-4\`}
      role="alert"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className={\`h-6 w-6 \${getSeverityColor()}\`} />
        </div>
        
        <div className="ml-3 flex-1">
          <h3 
            id="error-title"
            className={\`text-lg font-medium \${getSeverityColor()}\`}
          >
            {level === 'page' ? 'Page Error' : 
             level === 'section' ? 'Section Error' : 
             'Component Error'}
          </h3>
          
          <div id="error-description" className="mt-2 text-gray-700">
            <p>{userMessage || getDefaultMessage()}</p>
            
            {retryCount > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Retry attempt {retryCount} of 3
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-3">
            {(actions.length > 0 ? actions : getDefaultActions()).map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(action)}
                className={\`
                  inline-flex items-center px-3 py-2 border border-transparent text-sm 
                  leading-4 font-medium rounded-md focus:outline-none focus:ring-2 
                  focus:ring-offset-2 focus:ring-blue-500
                  \${action.primary 
                    ? 'text-white bg-blue-600 hover:bg-blue-700' 
                    : 'text-blue-700 bg-blue-100 hover:bg-blue-200'
                  }
                \`}
                disabled={action.action === 'retry' && !retryEnabled}
              >
                {action.action === 'retry' && <RefreshCw className="w-4 h-4 mr-1" />}
                {action.action === 'navigate' && action.target === '/' && <Home className="w-4 h-4 mr-1" />}
                {action.action === 'contact' && <Mail className="w-4 h-4 mr-1" />}
                {action.label}
              </button>
            ))}
          </div>

          {/* Developer details toggle */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </button>
              
              {showDetails && (
                <div className="mt-3 bg-gray-100 rounded p-3 text-xs font-mono">
                  <div className="mb-2">
                    <strong>Error ID:</strong> {errorId || 'N/A'}
                  </div>
                  <div className="mb-2">
                    <strong>Error:</strong> {error?.message || 'Unknown error'}
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs">
                      {error?.stack || 'No stack trace available'}
                    </pre>
                  </div>
                  {errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorFallbackComponent;
`;

/**
 * Hook for error handling in functional components
 */
export const useErrorHandlerHookPattern = `
import { useState, useCallback, useEffect } from 'react';
import { crossStreamErrorCoordinator } from '@/services/CrossStreamErrorCoordinator';

interface UseErrorHandlerOptions {
  component: string;
  reportToBackend?: boolean;
  showUserNotification?: boolean;
  retryEnabled?: boolean;
  maxRetries?: number;
}

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorId?: string;
  retryCount: number;
  isRetrying: boolean;
  userMessage?: string;
  actions?: ErrorAction[];
}

export const useErrorHandler = (options: UseErrorHandlerOptions) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    retryCount: 0,
    isRetrying: false,
  });

  const reportError = useCallback(async (error: Error, context?: Record<string, any>) => {
    try {
      const errorId = await crossStreamErrorCoordinator.reportError(
        error,
        {
          stream: 'frontend',
          component: options.component,
          operation: 'hook_error',
        },
        context
      );

      setErrorState(prev => ({
        ...prev,
        hasError: true,
        error,
        errorId,
      }));

      // Fetch user-friendly error information
      if (options.showUserNotification) {
        await fetchUserFriendlyError(errorId);
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      setErrorState(prev => ({
        ...prev,
        hasError: true,
        error,
      }));
    }
  }, [options.component, options.showUserNotification]);

  const fetchUserFriendlyError = useCallback(async (errorId: string) => {
    try {
      const response = await fetch(\`/api/errors/\${errorId}/user-friendly\`);
      const data = await response.json();
      
      setErrorState(prev => ({
        ...prev,
        userMessage: data.message,
        actions: data.actions,
      }));
    } catch (err) {
      console.warn('Failed to fetch user-friendly error:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    });
  }, []);

  const retry = useCallback(async (retryFunction?: () => Promise<void> | void) => {
    const maxRetries = options.maxRetries || 3;
    
    if (errorState.retryCount >= maxRetries) {
      return;
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }));

    try {
      if (retryFunction) {
        await retryFunction();
      }
      
      // If retry succeeded, clear error
      clearError();
    } catch (retryError) {
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        error: retryError instanceof Error ? retryError : new Error('Retry failed'),
      }));
    }
  }, [errorState.retryCount, options.maxRetries, clearError]);

  // Async error handling wrapper
  const wrapAsync = useCallback(<T extends any[], R>(
    asyncFunction: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await asyncFunction(...args);
      } catch (error) {
        await reportError(error instanceof Error ? error : new Error(String(error)));
        return null;
      }
    };
  }, [reportError]);

  // Synchronous error handling wrapper
  const wrapSync = useCallback(<T extends any[], R>(
    syncFunction: (...args: T) => R
  ) => {
    return (...args: T): R | null => {
      try {
        return syncFunction(...args);
      } catch (error) {
        reportError(error instanceof Error ? error : new Error(String(error)));
        return null;
      }
    };
  }, [reportError]);

  return {
    ...errorState,
    reportError,
    clearError,
    retry,
    wrapAsync,
    wrapSync,
    canRetry: errorState.retryCount < (options.maxRetries || 3) && options.retryEnabled !== false,
  };
};
`;

/**
 * Error boundary configurations for different app sections
 */
export const ErrorBoundaryConfigurations: Record<string, ErrorBoundaryConfig> =
  {
    // Page-level error boundaries
    dashboard: {
      name: "DashboardErrorBoundary",
      description: "Error boundary for the main dashboard page",
      level: "page",
      fallbackComponent: "DashboardErrorFallback",
      reportToBackend: true,
      retryEnabled: true,
      maxRetries: 3,
      autoRecover: false,
      userNotification: true,
      persistState: false,
    },

    routeManagement: {
      name: "RouteManagementErrorBoundary",
      description: "Error boundary for route management pages",
      level: "page",
      fallbackComponent: "RouteManagementErrorFallback",
      reportToBackend: true,
      retryEnabled: true,
      maxRetries: 2,
      autoRecover: false,
      userNotification: true,
      persistState: true,
    },

    customerPortal: {
      name: "CustomerPortalErrorBoundary",
      description: "Error boundary for customer-facing pages",
      level: "page",
      fallbackComponent: "CustomerPortalErrorFallback",
      reportToBackend: true,
      retryEnabled: true,
      maxRetries: 5,
      autoRecover: true,
      userNotification: true,
      persistState: false,
    },

    // Section-level error boundaries
    binTracker: {
      name: "BinTrackerErrorBoundary",
      description: "Error boundary for bin tracking components",
      level: "section",
      fallbackComponent: "BinTrackerErrorFallback",
      reportToBackend: true,
      retryEnabled: true,
      maxRetries: 3,
      autoRecover: true,
      userNotification: false,
      persistState: true,
    },

    mapView: {
      name: "MapViewErrorBoundary",
      description: "Error boundary for map and location components",
      level: "section",
      fallbackComponent: "MapViewErrorFallback",
      reportToBackend: true,
      retryEnabled: true,
      maxRetries: 2,
      autoRecover: false,
      userNotification: false,
      persistState: false,
    },

    // Component-level error boundaries
    dataTable: {
      name: "DataTableErrorBoundary",
      description: "Error boundary for data table components",
      level: "component",
      fallbackComponent: "DataTableErrorFallback",
      reportToBackend: false,
      retryEnabled: true,
      maxRetries: 1,
      autoRecover: true,
      userNotification: false,
      persistState: false,
    },
  };

/**
 * Error fallback component specifications
 */
export const ErrorFallbackSpecifications: Record<string, ErrorFallbackSpec> = {
  DashboardErrorFallback: {
    name: "Dashboard Error",
    component: "ErrorFallbackComponent",
    props: {
      level: "page",
      showMetrics: false,
      allowNavigation: true,
    },
    styling: {
      theme: "auto",
      size: "large",
      variant: "branded",
    },
    actions: [
      { label: "Refresh Dashboard", action: "refresh", primary: true },
      { label: "Go to Reports", action: "navigate", target: "/reports" },
      {
        label: "Contact Support",
        action: "contact",
        target: "support@company.com",
      },
    ],
    accessibility: {
      ariaLabel: "Dashboard error notification",
      focusManagement: true,
      announceToScreenReader: true,
    },
  },

  BinTrackerErrorFallback: {
    name: "Bin Tracker Unavailable",
    component: "ErrorFallbackComponent",
    props: {
      level: "section",
      showAlternatives: true,
    },
    styling: {
      theme: "light",
      size: "medium",
      variant: "detailed",
    },
    actions: [
      { label: "Retry", action: "retry", primary: true },
      { label: "Use List View", action: "navigate", target: "/bins/list" },
      {
        label: "View Offline Data",
        action: "custom",
        handler: "showOfflineData",
      },
    ],
    accessibility: {
      ariaLabel: "Bin tracker error with alternatives",
      focusManagement: false,
      announceToScreenReader: true,
    },
  },

  MapViewErrorFallback: {
    name: "Map Service Unavailable",
    component: "ErrorFallbackComponent",
    props: {
      level: "section",
      showFallbackMap: true,
    },
    styling: {
      theme: "light",
      size: "medium",
      variant: "minimal",
    },
    actions: [
      { label: "Retry Map", action: "retry", primary: true },
      {
        label: "Use Text Directions",
        action: "custom",
        handler: "showTextDirections",
      },
      {
        label: "Download Route PDF",
        action: "custom",
        handler: "downloadRoutePDF",
      },
    ],
    accessibility: {
      ariaLabel: "Map view error with alternative navigation options",
      focusManagement: false,
      announceToScreenReader: true,
    },
  },
};

/**
 * Usage examples and best practices
 */
export const UsageExamples = {
  basicUsage: `
// Basic error boundary usage
<WasteManagementErrorBoundary level="section" retryEnabled maxRetries={3}>
  <BinTrackingComponent />
</WasteManagementErrorBoundary>
  `,

  customFallback: `
// Custom fallback component
<WasteManagementErrorBoundary 
  level="page"
  fallback={<CustomErrorPage />}
  onError={(error, errorInfo) => {
    console.log('Custom error handler:', error);
    analytics.track('error_boundary_triggered', { error: error.message });
  }}
>
  <DashboardPage />
</WasteManagementErrorBoundary>
  `,

  hookUsage: `
// Using the error handler hook
const MyComponent = () => {
  const { hasError, error, reportError, retry, wrapAsync } = useErrorHandler({
    component: 'MyComponent',
    reportToBackend: true,
    retryEnabled: true,
  });

  const handleAsyncOperation = wrapAsync(async () => {
    const result = await apiCall();
    return result;
  });

  if (hasError) {
    return <ErrorDisplay error={error} onRetry={retry} />;
  }

  return <div>Component content</div>;
};
  `,

  nestedBoundaries: `
// Nested error boundaries for granular error handling
<WasteManagementErrorBoundary level="page">
  <PageLayout>
    <WasteManagementErrorBoundary level="section">
      <Navigation />
    </WasteManagementErrorBoundary>
    
    <WasteManagementErrorBoundary level="section">
      <MainContent>
        <WasteManagementErrorBoundary level="component">
          <DataTable />
        </WasteManagementErrorBoundary>
        
        <WasteManagementErrorBoundary level="component">
          <MapView />
        </WasteManagementErrorBoundary>
      </MainContent>
    </WasteManagementErrorBoundary>
  </PageLayout>
</WasteManagementErrorBoundary>
  `,
};

export default {
  ReactErrorBoundaryPattern,
  ErrorFallbackComponentPattern,
  useErrorHandlerHookPattern,
  ErrorBoundaryConfigurations,
  ErrorFallbackSpecifications,
  UsageExamples,
};
