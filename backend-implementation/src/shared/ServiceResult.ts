/**
 * ============================================================================
 * SERVICE RESULT COMPATIBILITY LAYER
 * ============================================================================
 *
 * Compatibility layer for service result interfaces, bridging different
 * result patterns used across the codebase. Enables seamless integration
 * between BaseService results and legacy response patterns.
 *
 * Features:
 * - Automatic pattern detection and conversion
 * - Type-safe result transformation
 * - Backward compatibility with existing code
 * - Support for multiple result interfaces
 *
 * Created by: External API Integration Specialist
 * Date: 2025-08-25
 * Version: 1.0.0
 */

/**
 * Standard ServiceResult interface used by BaseService
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
  status?: number;
}

/**
 * Legacy result interface patterns found in various services
 */
export interface LegacyResult<T = any> {
  isSuccess?: boolean;
  error?: string;
  statusCode?: number;
  message?: string;
  data?: T;
}

/**
 * Unified result interface combining all patterns
 */
export interface UnifiedResult<T = any> extends ServiceResult<T> {
  isSuccess?: boolean;
  error?: string;
  statusCode?: number;
  message?: string;
}

/**
 * Convert any result pattern to ServiceResult with compatibility fields
 */
export function asResult<T>(r: any): UnifiedResult<T> {
  if (!r || typeof r !== 'object') {
    return {
      success: false,
      data: undefined,
      errors: ['Invalid result object'],
      status: 500,
      isSuccess: false,
      error: 'Invalid result object',
      statusCode: 500
    };
  }

  // Primary success determination
  const success = r.success ?? r.isSuccess ?? false;
  
  // Error handling
  let errors: string[] | undefined;
  let error: string | undefined;
  
  if (r.errors && Array.isArray(r.errors)) {
    errors = r.errors;
    error = r.errors[0];
  } else if (r.error) {
    error = r.error;
    errors = [r.error];
  } else if (r.message && !success) {
    error = r.message;
    errors = [r.message];
  }

  // Status code determination
  const status = r.status ?? r.statusCode ?? (success ? 200 : 500);

  return {
    // Standard ServiceResult fields
    success,
    data: r.data,
    errors,
    status,
    
    // Legacy compatibility fields
    isSuccess: success,
    error,
    statusCode: status,
    message: r.message ?? (success ? 'Success' : error)
  };
}

/**
 * Check if result indicates success
 */
export function isSuccessResult(result: any): boolean {
  return result?.success === true || result?.isSuccess === true;
}

/**
 * Check if result indicates failure
 */
export function isErrorResult(result: any): boolean {
  return !isSuccessResult(result);
}

/**
 * Extract error message from any result pattern
 */
export function getErrorMessage(result: any): string {
  if (result?.error) return result.error;
  if (result?.errors && Array.isArray(result.errors) && result.errors.length > 0) {
    return result.errors[0];
  }
  if (result?.message && !isSuccessResult(result)) return result.message;
  return 'Unknown error occurred';
}

/**
 * Extract status code from any result pattern
 */
export function getStatusCode(result: any): number {
  return result?.status ?? result?.statusCode ?? (isSuccessResult(result) ? 200 : 500);
}

/**
 * Create a success result with compatibility fields
 */
export function createSuccessResult<T>(data: T, message?: string, status?: number): UnifiedResult<T> {
  return {
    success: true,
    data,
    errors: undefined,
    status: status ?? 200,
    isSuccess: true,
    error: undefined,
    statusCode: status ?? 200,
    message: message ?? 'Success'
  };
}

/**
 * Create an error result with compatibility fields
 */
export function createErrorResult<T>(message: string, status?: number, errors?: string[]): UnifiedResult<T> {
  const errorList = errors ?? [message];
  return {
    success: false,
    data: undefined,
    errors: errorList,
    status: status ?? 500,
    isSuccess: false,
    error: message,
    statusCode: status ?? 500,
    message
  };
}

export default {
  asResult,
  isSuccessResult,
  isErrorResult,
  getErrorMessage,
  getStatusCode,
  createSuccessResult,
  createErrorResult
};