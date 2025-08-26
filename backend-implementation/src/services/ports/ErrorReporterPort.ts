import { ErrorSeverity, ErrorCategory, BusinessImpact, SystemLayer } from './ErrorTypes';

/**
 * Port interface for error reporting to break circular dependencies
 */
export interface ErrorReporterPort {
  /**
   * Report an error event
   */
  report(event: {
    code: string;
    message: string;
    meta?: unknown;
    severity: ErrorSeverity;
    category?: ErrorCategory;
    businessImpact?: BusinessImpact;
    systemLayer?: SystemLayer;
  }): Promise<void>;

  /**
   * Start monitoring for error patterns
   */
  startMonitoring?(): void;

  /**
   * Stop monitoring
   */
  stopMonitoring?(): void;
}