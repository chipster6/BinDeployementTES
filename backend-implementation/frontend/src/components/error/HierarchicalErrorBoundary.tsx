'use client';

/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - HIERARCHICAL ERROR BOUNDARY
 * ============================================================================
 * 
 * Advanced hierarchical error boundary system that provides different levels
 * of error isolation and recovery strategies based on component hierarchy.
 * Implements graceful degradation and fallback UI components for resilient
 * user experience.
 *
 * Features:
 * - Multiple error boundary levels (Application, Page, Section, Component)
 * - Context-aware error handling and recovery
 * - Fallback UI components with different strategies
 * - Error reporting and monitoring integration
 * - User-friendly error experiences with recovery options
 * - Offline mode detection and handling
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-23
 * Version: 1.0.0
 */

import React, { Component, ErrorInfo, ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  WifiOff,
  Loader2,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Error boundary levels
export type ErrorBoundaryLevel = 'application' | 'page' | 'section' | 'component';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Fallback strategies
export type FallbackStrategy = 
  | 'full_page_replacement'
  | 'section_degradation'
  | 'component_placeholder'
  | 'skeleton_ui'
  | 'minimal_ui'
  | 'retry_prompt'
  | 'offline_mode';

export interface ErrorBoundaryConfig {
  level: ErrorBoundaryLevel;
  fallbackStrategy: FallbackStrategy;
  enableRetry: boolean;
  enableReporting: boolean;
  enableOfflineDetection: boolean;
  maxRetries: number;
  retryDelay: number;
  customErrorClassifier?: (error: Error) => ErrorSeverity;
  onError?: (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => void;
  onRecovery?: (context: ErrorContext) => void;
}

export interface ErrorContext {
  level: ErrorBoundaryLevel;
  componentName?: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  networkStatus: 'online' | 'offline' | 'unknown';
  previousErrors: ErrorRecord[];
}

export interface ErrorRecord {
  error: Error;
  timestamp: Date;
  level: ErrorBoundaryLevel;
  recovered: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isRetrying: boolean;
  severity: ErrorSeverity;
  networkStatus: 'online' | 'offline' | 'unknown';
  lastRetry: Date | null;
}

// Global error context
const ErrorReportingContext = createContext<{
  reportError: (error: Error, context: ErrorContext) => void;
  getErrorHistory: () => ErrorRecord[];
  clearErrorHistory: () => void;
  isOffline: boolean;
}>({
  reportError: () => {},
  getErrorHistory: () => [],
  clearErrorHistory: () => {},
  isOffline: false
});

// Error reporting provider
export function ErrorReportingProvider({ children }: { children: ReactNode }) {
  const [errorHistory, setErrorHistory] = useState<ErrorRecord[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Network status monitoring
    const updateNetworkStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  const reportError = (error: Error, context: ErrorContext) => {
    const errorRecord: ErrorRecord = {
      error,
      timestamp: new Date(),
      level: context.level,
      recovered: false
    };

    setErrorHistory(prev => [...prev.slice(-9), errorRecord]); // Keep last 10 errors

    // Send to monitoring service (if online)
    if (!isOffline) {
      try {
        fetch('/api/v1/monitoring/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            },
            context: {
              ...context,
              errorHistory: errorHistory.slice(-3) // Send last 3 errors for context
            }
          })
        }).catch(err => {
          console.warn('Failed to report error to monitoring service:', err);
        });
      } catch (reportingError) {
        console.warn('Error reporting failed:', reportingError);
      }
    }
  };

  const getErrorHistory = () => errorHistory;
  const clearErrorHistory = () => setErrorHistory([]);

  return (
    <ErrorReportingContext.Provider value={{
      reportError,
      getErrorHistory,
      clearErrorHistory,
      isOffline
    }}>
      {children}
    </ErrorReportingContext.Provider>
  );
}

// Main hierarchical error boundary
export class HierarchicalErrorBoundary extends Component<
  ErrorBoundaryConfig & { children: ReactNode },
  ErrorBoundaryState
> {
  private retryTimeout: NodeJS.Timeout | null = null;
  private static contextType = ErrorReportingContext;
  declare context: React.ContextType<typeof ErrorReportingContext>;

  constructor(props: ErrorBoundaryConfig & { children: ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isRetrying: false,
      severity: 'medium',
      networkStatus: 'online',
      lastRetry: null
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const severity = this.classifyError(error);
    const networkStatus = navigator.onLine ? 'online' : 'offline';

    this.setState({
      errorInfo,
      severity,
      networkStatus
    });

    // Create error context
    const errorContext: ErrorContext = {
      level: this.props.level,
      componentName: this.constructor.name,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      networkStatus,
      previousErrors: this.context.getErrorHistory()
    };

    // Report error
    this.context.reportError(error, errorContext);

    // Call custom error handler
    this.props.onError?.(error, errorInfo, errorContext);

    // Auto-retry for certain error types
    this.scheduleAutoRetry(error, severity);
  }

  private classifyError(error: Error): ErrorSeverity {
    if (this.props.customErrorClassifier) {
      return this.props.customErrorClassifier(error);
    }

    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'high';
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'high';
    }

    // Rendering errors
    if (stack.includes('render') || message.includes('cannot read prop')) {
      return 'medium';
    }

    // Default classification
    return 'medium';
  }

  private scheduleAutoRetry(error: Error, severity: ErrorSeverity) {
    // Only auto-retry for network errors and low/medium severity
    const shouldAutoRetry = 
      (severity === 'low' || severity === 'medium') &&
      this.state.retryCount < this.props.maxRetries &&
      this.props.enableRetry;

    if (shouldAutoRetry) {
      const delay = this.calculateRetryDelay();
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, delay);
    }
  }

  private calculateRetryDelay(): number {
    const baseDelay = this.props.retryDelay || 2000;
    const exponentialBackoff = Math.pow(2, this.state.retryCount);
    return Math.min(baseDelay * exponentialBackoff, 30000); // Max 30 seconds
  }

  private handleRetry = () => {
    if (this.state.retryCount >= this.props.maxRetries) {
      return;
    }

    this.setState(prevState => ({
      isRetrying: true,
      retryCount: prevState.retryCount + 1,
      lastRetry: new Date()
    }));

    // Clear error state after brief loading indication
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        severity: 'medium'
      });

      // Report recovery
      if (this.props.onRecovery) {
        const context: ErrorContext = {
          level: this.props.level,
          componentName: this.constructor.name,
          userId: this.getUserId(),
          sessionId: this.getSessionId(),
          timestamp: new Date(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          networkStatus: navigator.onLine ? 'online' : 'offline',
          previousErrors: this.context.getErrorHistory()
        };
        this.props.onRecovery(context);
      }
    }, 1000);
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReportBug = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || 'No stack trace',
      componentStack: this.state.errorInfo?.componentStack || 'No component stack',
      level: this.props.level,
      severity: this.state.severity,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      retryCount: this.state.retryCount,
      networkStatus: this.state.networkStatus
    };

    const subject = encodeURIComponent(`Bug Report: ${this.props.level} Error`);
    const body = encodeURIComponent(`
Error Details:
${JSON.stringify(errorDetails, null, 2)}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    window.open(`mailto:support@wastemanagement.com?subject=${subject}&body=${body}`);
  };

  private getUserId(): string | undefined {
    // Extract from auth context or localStorage
    return localStorage.getItem('userId') || undefined;
  }

  private getSessionId(): string | undefined {
    // Extract from session storage or generate
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  public componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private renderFallbackUI(): ReactNode {
    const { fallbackStrategy, level } = this.props;
    const { error, severity, networkStatus, retryCount, isRetrying } = this.state;

    // Show retry loader
    if (isRetrying) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Attempting to recover...</p>
          </div>
        </div>
      );
    }

    // Offline mode fallback
    if (networkStatus === 'offline') {
      return <OfflineFallback onRetry={this.handleRetry} />;
    }

    switch (fallbackStrategy) {
      case 'full_page_replacement':
        return this.renderFullPageError();
      case 'section_degradation':
        return this.renderSectionDegradation();
      case 'component_placeholder':
        return this.renderComponentPlaceholder();
      case 'skeleton_ui':
        return this.renderSkeletonUI();
      case 'minimal_ui':
        return this.renderMinimalUI();
      case 'retry_prompt':
        return this.renderRetryPrompt();
      default:
        return this.renderDefaultError();
    }
  }

  private renderFullPageError(): ReactNode {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <ErrorHeader 
            title="Application Error"
            subtitle="We encountered a critical error that requires your attention"
            severity={this.state.severity}
          />
          <ErrorDetailsCard 
            error={this.state.error!}
            errorInfo={this.state.errorInfo}
            errorId={this.state.errorId}
            level={this.props.level}
          />
          <ErrorActions
            onRetry={this.props.enableRetry && this.state.retryCount < this.props.maxRetries ? this.handleRetry : undefined}
            onGoHome={this.handleGoHome}
            onReportBug={this.handleReportBug}
            retryCount={this.state.retryCount}
            maxRetries={this.props.maxRetries}
          />
        </div>
      </div>
    );
  }

  private renderSectionDegradation(): ReactNode {
    return (
      <Card className="m-4 border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
            <CardTitle className="text-orange-800">Section Temporarily Unavailable</CardTitle>
          </div>
          <CardDescription>
            This section is experiencing issues and has been temporarily disabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-orange-700">
              Error ID: <code className="bg-orange-100 px-1 rounded">{this.state.errorId}</code>
            </p>
            {this.props.enableRetry && this.state.retryCount < this.props.maxRetries && (
              <Button onClick={this.handleRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  private renderComponentPlaceholder(): ReactNode {
    return (
      <Alert className="m-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Component failed to load</span>
          {this.props.enableRetry && (
            <Button onClick={this.handleRetry} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  private renderSkeletonUI(): ReactNode {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  private renderMinimalUI(): ReactNode {
    return (
      <div className="p-4 text-center text-gray-500">
        <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">Content temporarily unavailable</p>
      </div>
    );
  }

  private renderRetryPrompt(): ReactNode {
    return (
      <div className="text-center p-8">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
        <p className="text-gray-600 mb-6">Please try again or contact support if the problem persists.</p>
        <div className="space-x-4">
          <Button onClick={this.handleRetry} disabled={!this.props.enableRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={this.handleReportBug} variant="outline">
            <Bug className="h-4 w-4 mr-2" />
            Report Issue
          </Button>
        </div>
      </div>
    );
  }

  private renderDefaultError(): ReactNode {
    return this.renderFullPageError();
  }

  public render() {
    if (this.state.hasError) {
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

// Error header component
function ErrorHeader({ title, subtitle, severity }: {
  title: string;
  subtitle: string;
  severity: ErrorSeverity;
}) {
  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-red-500';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="text-center animate-slide-up">
      <div className="flex items-center justify-center mb-6">
        <div className="p-4 bg-red-100 rounded-full">
          <AlertTriangle className="h-12 w-12 text-red-600" />
        </div>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 text-lg mb-4">{subtitle}</p>
      <Badge variant="secondary" className={getSeverityColor(severity)}>
        {severity.toUpperCase()} SEVERITY
      </Badge>
    </div>
  );
}

// Error details card component
function ErrorDetailsCard({ error, errorInfo, errorId, level }: {
  error: Error;
  errorInfo: ErrorInfo | null;
  errorId: string;
  level: ErrorBoundaryLevel;
}) {
  return (
    <Card className="shadow-xl bg-white/95 backdrop-blur-sm border-0 animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl text-red-700 flex items-center">
          <Bug className="mr-2 h-5 w-5" />
          Error Details
        </CardTitle>
        <CardDescription>
          Technical information about what happened
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">Error Message:</h4>
          <p className="text-sm text-red-700 font-mono">
            {error.message || 'Unknown error occurred'}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Error Information:</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Error ID:</strong> {errorId}</p>
            <p><strong>Boundary Level:</strong> {level}</p>
            <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && error.stack && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Stack Trace:</h4>
            <pre className="text-xs text-gray-600 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
              {error.stack}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Error actions component
function ErrorActions({ onRetry, onGoHome, onReportBug, retryCount, maxRetries }: {
  onRetry?: () => void;
  onGoHome: () => void;
  onReportBug: () => void;
  retryCount: number;
  maxRetries: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
      {onRetry && (
        <Button 
          onClick={onRetry}
          className="btn-primary-enhanced flex items-center justify-center"
          disabled={retryCount >= maxRetries}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
        </Button>
      )}
      
      <Button 
        onClick={onGoHome}
        variant="outline"
        className="flex items-center justify-center"
      >
        <Home className="mr-2 h-4 w-4" />
        Go to Dashboard
      </Button>
      
      <Button 
        onClick={onReportBug}
        variant="outline"
        className="flex items-center justify-center"
      >
        <Bug className="mr-2 h-4 w-4" />
        Report Bug
      </Button>
    </div>
  );
}

// Offline fallback component
function OfflineFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center p-8">
      <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Internet Connection</h3>
      <p className="text-gray-600 mb-6">
        Please check your internet connection and try again.
      </p>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}

// Predefined error boundary configurations
export const ErrorBoundaryConfigs = {
  application: {
    level: 'application' as ErrorBoundaryLevel,
    fallbackStrategy: 'full_page_replacement' as FallbackStrategy,
    enableRetry: true,
    enableReporting: true,
    enableOfflineDetection: true,
    maxRetries: 2,
    retryDelay: 3000
  },
  page: {
    level: 'page' as ErrorBoundaryLevel,
    fallbackStrategy: 'section_degradation' as FallbackStrategy,
    enableRetry: true,
    enableReporting: true,
    enableOfflineDetection: true,
    maxRetries: 3,
    retryDelay: 2000
  },
  section: {
    level: 'section' as ErrorBoundaryLevel,
    fallbackStrategy: 'component_placeholder' as FallbackStrategy,
    enableRetry: true,
    enableReporting: false,
    enableOfflineDetection: false,
    maxRetries: 5,
    retryDelay: 1000
  },
  component: {
    level: 'component' as ErrorBoundaryLevel,
    fallbackStrategy: 'minimal_ui' as FallbackStrategy,
    enableRetry: true,
    enableReporting: false,
    enableOfflineDetection: false,
    maxRetries: 3,
    retryDelay: 500
  }
};

// Convenience components
export const ApplicationErrorBoundary = ({ children }: { children: ReactNode }) => (
  <HierarchicalErrorBoundary {...ErrorBoundaryConfigs.application}>
    {children}
  </HierarchicalErrorBoundary>
);

export const PageErrorBoundary = ({ children }: { children: ReactNode }) => (
  <HierarchicalErrorBoundary {...ErrorBoundaryConfigs.page}>
    {children}
  </HierarchicalErrorBoundary>
);

export const SectionErrorBoundary = ({ children }: { children: ReactNode }) => (
  <HierarchicalErrorBoundary {...ErrorBoundaryConfigs.section}>
    {children}
  </HierarchicalErrorBoundary>
);

export const ComponentErrorBoundary = ({ children }: { children: ReactNode }) => (
  <HierarchicalErrorBoundary {...ErrorBoundaryConfigs.component}>
    {children}
  </HierarchicalErrorBoundary>
);

export default HierarchicalErrorBoundary;