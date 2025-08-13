'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Report error to monitoring service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Here you would typically send the error to your monitoring service
    // For example: Sentry, LogRocket, or custom analytics
    console.warn('Error reported:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReportBug = () => {
    const errorDetails = {
      message: this.state.error?.message || 'Unknown error',
      stack: this.state.error?.stack || 'No stack trace',
      componentStack: this.state.errorInfo?.componentStack || 'No component stack',
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    const subject = encodeURIComponent('Bug Report: Frontend Error');
    const body = encodeURIComponent(`
Error Details:
${JSON.stringify(errorDetails, null, 2)}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    window.open(`mailto:support@wastemanagement.com?subject=${subject}&body=${body}`);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-6">
            {/* Error Header */}
            <div className="text-center animate-slide-up">
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 bg-red-100 rounded-full">
                  <AlertTriangle className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 text-lg">
                We encountered an unexpected error. Our team has been notified.
              </p>
            </div>

            {/* Error Card */}
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
                    {this.state.error?.message || 'Unknown error occurred'}
                  </p>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Stack Trace:</h4>
                    <pre className="text-xs text-gray-600 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">What can you do?</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Try refreshing the page or clicking "Retry" below</li>
                    <li>• Return to the dashboard and try again</li>
                    <li>• If the problem persists, report it to our support team</li>
                    <li>• Check if you have a stable internet connection</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Button 
                onClick={this.handleRetry}
                className="btn-primary-enhanced flex items-center justify-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                variant="outline"
                className="flex items-center justify-center"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
              
              <Button 
                onClick={this.handleReportBug}
                variant="outline"
                className="flex items-center justify-center"
              >
                <Bug className="mr-2 h-4 w-4" />
                Report Bug
              </Button>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 animate-fade-in">
              <p>Error ID: {Date.now().toString(36)}</p>
              <p className="mt-1">Our team has been automatically notified about this issue.</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;