'use client';

/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER ERROR EXPERIENCE COMPONENTS
 * ============================================================================
 * 
 * Comprehensive user-friendly error experience components that provide
 * clear, actionable error messages and recovery flows. Designed to 
 * maintain user confidence and provide helpful guidance during
 * system issues or failures.
 *
 * Features:
 * - Context-aware error messages and solutions
 * - Progressive disclosure of technical details
 * - Smart recovery suggestions based on error type
 * - Visual error severity indicators
 * - Accessibility-compliant error presentations
 * - Multi-modal error communication (visual, text, icons)
 *
 * Created by: Error Resilience Guardian
 * Date: 2025-08-23
 * Version: 1.0.0
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  Phone,
  Mail,
  MessageCircle,
  ArrowRight,
  Clock,
  WifiOff,
  Database,
  CreditCard,
  Truck,
  User,
  Shield,
  Zap,
  HelpCircle,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Error category definitions
export type ErrorCategory = 
  | 'network'
  | 'authentication' 
  | 'authorization'
  | 'validation'
  | 'payment'
  | 'route_planning'
  | 'database'
  | 'external_service'
  | 'system'
  | 'user_input'
  | 'timeout';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface UserFriendlyError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  message: string;
  userMessage: string;
  technicalMessage?: string;
  suggestedActions: SuggestedAction[];
  recoverySteps?: RecoveryStep[];
  supportInfo?: SupportInfo;
  estimatedResolution?: Date;
  affectedFeatures?: string[];
  workarounds?: Workaround[];
}

export interface SuggestedAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void> | void;
  primary: boolean;
  icon?: ReactNode;
  requiresConfirmation?: boolean;
}

export interface RecoveryStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  inProgress: boolean;
  canSkip: boolean;
  estimatedTime?: number;
  action?: () => Promise<boolean>;
}

export interface SupportInfo {
  showContact: boolean;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  channels: Array<{
    type: 'phone' | 'email' | 'chat' | 'help_center';
    label: string;
    value: string;
    available: boolean;
    responseTime?: string;
  }>;
  knowledgeBaseLinks?: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

export interface Workaround {
  id: string;
  title: string;
  description: string;
  steps: string[];
  effectiveness: 'full' | 'partial' | 'temporary';
  difficulty: 'easy' | 'medium' | 'advanced';
}

// Main error experience component
export function UserErrorExperience({ 
  error, 
  onRetry,
  onDismiss,
  showTechnicalDetails = false 
}: {
  error: UserFriendlyError;
  onRetry?: () => Promise<void>;
  onDismiss?: () => void;
  showTechnicalDetails?: boolean;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(showTechnicalDetails);
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleActionClick = async (action: SuggestedAction) => {
    if (action.requiresConfirmation) {
      const confirmed = window.confirm(`Are you sure you want to ${action.label.toLowerCase()}?`);
      if (!confirmed) return;
    }

    try {
      await action.action();
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const getErrorIcon = (category: ErrorCategory, severity: ErrorSeverity) => {
    const iconMap = {
      network: WifiOff,
      authentication: User,
      authorization: Shield,
      validation: AlertTriangle,
      payment: CreditCard,
      route_planning: Truck,
      database: Database,
      external_service: ExternalLink,
      system: Zap,
      user_input: HelpCircle,
      timeout: Clock
    };

    const IconComponent = iconMap[category] || AlertTriangle;
    const colorClass = getSeverityColor(severity);
    
    return <IconComponent className={`h-6 w-6 ${colorClass}`} />;
  };

  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case 'info': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'critical': return 'text-red-700';
      default: return 'text-gray-600';
    }
  };

  const getSeverityBg = (severity: ErrorSeverity): string => {
    switch (severity) {
      case 'info': return 'bg-blue-50 border-blue-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'critical': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className={`shadow-lg ${getSeverityBg(error.severity)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${getSeverityBg(error.severity)}`}>
            {getErrorIcon(error.category, error.severity)}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-1">
              {error.title}
            </CardTitle>
            <CardDescription className="text-gray-700">
              {error.userMessage}
            </CardDescription>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline" className={getSeverityColor(error.severity)}>
                {error.severity.toUpperCase()}
              </Badge>
              <Badge variant="secondary">
                {error.category.replace('_', ' ').toUpperCase()}
              </Badge>
              {error.estimatedResolution && (
                <Badge variant="outline" className="text-blue-600">
                  <Clock className="h-3 w-3 mr-1" />
                  Est. {error.estimatedResolution.toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Affected Features */}
        {error.affectedFeatures && error.affectedFeatures.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Affected features:</strong> {error.affectedFeatures.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Primary Actions */}
        <div className="flex flex-wrap gap-2">
          {error.suggestedActions
            .filter(action => action.primary)
            .map(action => (
              <Button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="flex items-center"
                disabled={isRetrying || recoveryInProgress}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
                {isRetrying && action.id === 'retry' && (
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                )}
              </Button>
            ))}
        </div>

        {/* Recovery Steps */}
        {error.recoverySteps && error.recoverySteps.length > 0 && (
          <RecoveryStepsComponent
            steps={error.recoverySteps}
            onStepComplete={(stepId) => setCompletedSteps(prev => [...prev, stepId])}
            onRecoveryStart={() => setRecoveryInProgress(true)}
            onRecoveryComplete={() => setRecoveryInProgress(false)}
          />
        )}

        {/* Workarounds */}
        {error.workarounds && error.workarounds.length > 0 && (
          <WorkaroundsComponent workarounds={error.workarounds} />
        )}

        {/* Secondary Actions */}
        {error.suggestedActions.filter(action => !action.primary).length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Other options:</p>
            <div className="flex flex-wrap gap-2">
              {error.suggestedActions
                .filter(action => !action.primary)
                .map(action => (
                  <Button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* Technical Details */}
        {error.technicalMessage && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            >
              {showDetails ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
              Technical Details
            </button>
            {showDetails && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <code className="text-sm text-gray-700">
                  {error.technicalMessage}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-2"
                  onClick={() => navigator.clipboard?.writeText(error.technicalMessage!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Support Information */}
        {error.supportInfo && (
          <SupportInfoComponent supportInfo={error.supportInfo} errorId={error.id} />
        )}
      </CardContent>
    </Card>
  );
}

// Recovery steps component
function RecoveryStepsComponent({ 
  steps, 
  onStepComplete,
  onRecoveryStart,
  onRecoveryComplete 
}: {
  steps: RecoveryStep[];
  onStepComplete: (stepId: string) => void;
  onRecoveryStart: () => void;
  onRecoveryComplete: () => void;
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStates, setStepStates] = useState(steps);

  const executeStep = async (step: RecoveryStep, index: number) => {
    if (!step.action) return;

    // Update step to in progress
    setStepStates(prev => prev.map((s, i) => 
      i === index ? { ...s, inProgress: true } : s
    ));

    if (index === 0) onRecoveryStart();

    try {
      const success = await step.action();
      
      setStepStates(prev => prev.map((s, i) => 
        i === index ? { ...s, completed: success, inProgress: false } : s
      ));

      if (success) {
        onStepComplete(step.id);
        setCurrentStepIndex(index + 1);
      }

      if (index === steps.length - 1) {
        onRecoveryComplete();
      }
    } catch (error) {
      setStepStates(prev => prev.map((s, i) => 
        i === index ? { ...s, inProgress: false } : s
      ));
    }
  };

  const completedCount = stepStates.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">Recovery Steps</h4>
          <span className="text-sm text-gray-500">
            {completedCount}/{steps.length} completed
          </span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      <div className="space-y-3">
        {stepStates.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start space-x-3 p-3 rounded-lg border ${
              step.completed ? 'bg-green-50 border-green-200' :
              step.inProgress ? 'bg-blue-50 border-blue-200' :
              index === currentStepIndex ? 'bg-yellow-50 border-yellow-200' :
              'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : step.inProgress ? (
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              ) : (
                <div className={`w-5 h-5 rounded-full border-2 ${
                  index === currentStepIndex ? 'border-yellow-400 bg-yellow-100' : 'border-gray-300'
                }`} />
              )}
            </div>
            <div className="flex-1">
              <h5 className="font-medium text-gray-900">{step.title}</h5>
              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
              {step.estimatedTime && (
                <p className="text-xs text-gray-500 mt-1">
                  Est. {step.estimatedTime} seconds
                </p>
              )}
            </div>
            {index === currentStepIndex && step.action && !step.completed && (
              <Button
                size="sm"
                onClick={() => executeStep(step, index)}
                disabled={step.inProgress}
              >
                {step.inProgress ? 'Running...' : 'Execute'}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Workarounds component
function WorkaroundsComponent({ workarounds }: { workarounds: Workaround[] }) {
  const [expandedWorkaround, setExpandedWorkaround] = useState<string | null>(null);

  const getEffectivenessColor = (effectiveness: Workaround['effectiveness']) => {
    switch (effectiveness) {
      case 'full': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'temporary': return 'text-orange-600 bg-orange-100';
    }
  };

  const getDifficultyColor = (difficulty: Workaround['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'text-blue-600 bg-blue-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900">Available Workarounds</h4>
      {workarounds.map(workaround => (
        <div key={workaround.id} className="border border-gray-200 rounded-lg">
          <div
            className="flex items-center justify-between p-3 cursor-pointer"
            onClick={() => setExpandedWorkaround(
              expandedWorkaround === workaround.id ? null : workaround.id
            )}
          >
            <div className="flex-1">
              <h5 className="font-medium text-gray-900">{workaround.title}</h5>
              <p className="text-sm text-gray-600 mt-1">{workaround.description}</p>
              <div className="flex space-x-2 mt-2">
                <Badge className={getEffectivenessColor(workaround.effectiveness)}>
                  {workaround.effectiveness}
                </Badge>
                <Badge className={getDifficultyColor(workaround.difficulty)}>
                  {workaround.difficulty}
                </Badge>
              </div>
            </div>
            {expandedWorkaround === workaround.id ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
          {expandedWorkaround === workaround.id && (
            <div className="px-3 pb-3 border-t border-gray-100">
              <div className="mt-3">
                <h6 className="font-medium text-gray-700 mb-2">Steps:</h6>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  {workaround.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Support information component
function SupportInfoComponent({ 
  supportInfo, 
  errorId 
}: { 
  supportInfo: SupportInfo;
  errorId: string;
}) {
  const getUrgencyColor = (urgency: SupportInfo['urgency']) => {
    switch (urgency) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'chat': return <MessageCircle className="h-4 w-4" />;
      case 'help_center': return <HelpCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">Need Help?</h4>
        <Badge className={getUrgencyColor(supportInfo.urgency)}>
          {supportInfo.urgency} priority
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {supportInfo.channels.map((channel, index) => (
          <div
            key={index}
            className={`p-3 border rounded-lg ${
              channel.available ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1">
              {getChannelIcon(channel.type)}
              <span className="font-medium text-sm">{channel.label}</span>
              {!channel.available && (
                <Badge variant="secondary" className="text-xs">
                  Unavailable
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{channel.value}</p>
            {channel.responseTime && (
              <p className="text-xs text-gray-500 mt-1">
                Response time: {channel.responseTime}
              </p>
            )}
          </div>
        ))}
      </div>

      {supportInfo.knowledgeBaseLinks && supportInfo.knowledgeBaseLinks.length > 0 && (
        <div className="mt-3">
          <h5 className="font-medium text-gray-700 mb-2">Related Help Articles:</h5>
          <div className="space-y-1">
            {supportInfo.knowledgeBaseLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
        <strong>Error ID:</strong> {errorId}
      </div>
    </div>
  );
}

// Error factory function for creating user-friendly errors
export function createUserFriendlyError(
  originalError: Error,
  category: ErrorCategory,
  customOverrides?: Partial<UserFriendlyError>
): UserFriendlyError {
  const errorTemplates = getErrorTemplates();
  const template = errorTemplates[category] || errorTemplates.system;
  
  return {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    category,
    severity: template.severity,
    title: template.title,
    message: originalError.message,
    userMessage: template.userMessage,
    technicalMessage: originalError.stack,
    suggestedActions: template.suggestedActions,
    recoverySteps: template.recoverySteps,
    supportInfo: template.supportInfo,
    workarounds: template.workarounds,
    ...customOverrides
  };
}

// Error templates for different categories
function getErrorTemplates(): Record<ErrorCategory, Partial<UserFriendlyError>> {
  return {
    network: {
      severity: 'error',
      title: 'Connection Problem',
      userMessage: 'We\'re having trouble connecting to our servers. This might be a temporary network issue.',
      suggestedActions: [
        {
          id: 'retry',
          label: 'Try Again',
          description: 'Retry the operation',
          action: () => window.location.reload(),
          primary: true,
          icon: <RefreshCw className="h-4 w-4" />
        }
      ]
    },
    authentication: {
      severity: 'warning',
      title: 'Authentication Required',
      userMessage: 'Your session has expired. Please log in again to continue.',
      suggestedActions: [
        {
          id: 'login',
          label: 'Go to Login',
          description: 'Redirect to login page',
          action: () => { window.location.href = '/login'; },
          primary: true,
          icon: <User className="h-4 w-4" />
        }
      ]
    },
    validation: {
      severity: 'warning',
      title: 'Input Validation Error',
      userMessage: 'Please check your input and try again.',
      suggestedActions: [
        {
          id: 'correct',
          label: 'Review Input',
          description: 'Check and correct the highlighted fields',
          action: () => {},
          primary: true
        }
      ]
    },
    system: {
      severity: 'error',
      title: 'System Error',
      userMessage: 'We encountered an unexpected error. Our team has been notified and is working on a fix.',
      suggestedActions: [
        {
          id: 'retry',
          label: 'Try Again',
          description: 'Retry the operation',
          action: () => window.location.reload(),
          primary: true,
          icon: <RefreshCw className="h-4 w-4" />
        }
      ],
      supportInfo: {
        showContact: true,
        urgency: 'medium',
        channels: [
          {
            type: 'email',
            label: 'Email Support',
            value: 'support@wastemanagement.com',
            available: true,
            responseTime: '4-6 hours'
          }
        ]
      }
    }
  } as any;
}

export default UserErrorExperience;