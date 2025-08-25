/**
 * ============================================================================
 * REQUEST SIZE SECURITY MIDDLEWARE - PRODUCTION HARDENED
 * ============================================================================
 * 
 * Endpoint-specific request size limits to prevent DoS attacks:
 * - Default: 1MB for general API requests
 * - File uploads: 10MB maximum
 * - JSON payloads: 1MB maximum  
 * - URL encoded: 1MB maximum
 * - Critical endpoints: 100KB maximum
 * 
 * Created for: Critical Security Hardening Implementation
 * Date: 2025-08-24
 * ============================================================================
 */

import { Request, Response, NextFunction } from "express";
import { logger, logSecurityEvent } from "@/utils/logger";
import type { AuthenticatedRequest } from "@/middleware/auth";

/**
 * Convert size string to bytes
 */
const parseSize = (size: string): number => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'b') as keyof typeof units;
  
  return Math.round(value * units[unit]);
};

/**
 * Request size validation middleware factory
 */
export const createRequestSizeValidator = (options: {
  maxSize: string;
  type: 'json' | 'raw' | 'text' | 'urlencoded';
  endpoint?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}) => {
  const maxBytes = parseSize(options.maxSize);
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    // Check if content length exceeds the limit
    if (contentLength > maxBytes) {
      // Log security event for oversized request
      logSecurityEvent(
        "oversized_request_blocked",
        {
          contentLength,
          maxAllowed: maxBytes,
          maxAllowedFormatted: options.maxSize,
          type: options.type,
          endpoint: options.endpoint || req.path,
          userAgent: req.headers['user-agent'],
          method: req.method,
          url: req.originalUrl,
        },
        authReq.user?.id,
        req.ip,
        options.severity || "high",
      );

      logger.warn("Request size exceeded limit", {
        userId: authReq.user?.id,
        ip: req.ip,
        contentLength,
        maxAllowed: maxBytes,
        endpoint: options.endpoint || req.path,
        type: options.type,
      });

      return res.status(413).json({
        success: false,
        error: 'request_too_large',
        message: `Request size (${contentLength} bytes) exceeds maximum allowed size (${options.maxSize}).`,
        maxSize: options.maxSize,
        actualSize: contentLength,
        type: options.type,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

/**
 * STANDARD REQUEST SIZE LIMITS
 */

// Default JSON request size limit (1MB)
export const jsonSizeLimit = createRequestSizeValidator({
  maxSize: '1mb',
  type: 'json',
  severity: 'high',
});

// URL encoded form data size limit (1MB)
export const urlEncodedSizeLimit = createRequestSizeValidator({
  maxSize: '1mb',
  type: 'urlencoded',
  severity: 'high',
});

// Raw data size limit (1MB)
export const rawSizeLimit = createRequestSizeValidator({
  maxSize: '1mb',
  type: 'raw',
  severity: 'high',
});

// Text data size limit (1MB)
export const textSizeLimit = createRequestSizeValidator({
  maxSize: '1mb',
  type: 'text',
  severity: 'medium',
});

/**
 * ENDPOINT-SPECIFIC SIZE LIMITS
 */

// File upload endpoints (10MB maximum)
export const fileUploadSizeLimit = createRequestSizeValidator({
  maxSize: '10mb',
  type: 'raw',
  endpoint: 'file-upload',
  severity: 'high',
});

// Critical authentication endpoints (100KB maximum)
export const authEndpointSizeLimit = createRequestSizeValidator({
  maxSize: '100kb',
  type: 'json',
  endpoint: 'auth',
  severity: 'critical',
});

// User registration/update endpoints (500KB maximum)
export const userDataSizeLimit = createRequestSizeValidator({
  maxSize: '500kb',
  type: 'json',
  endpoint: 'user-data',
  severity: 'high',
});

// Route optimization endpoints (2MB maximum for complex route data)
export const routeOptimizationSizeLimit = createRequestSizeValidator({
  maxSize: '2mb',
  type: 'json',
  endpoint: 'route-optimization',
  severity: 'medium',
});

// Bulk data import endpoints (5MB maximum)
export const bulkImportSizeLimit = createRequestSizeValidator({
  maxSize: '5mb',
  type: 'json',
  endpoint: 'bulk-import',
  severity: 'medium',
});

// Analytics data endpoints (1MB maximum)
export const analyticsSizeLimit = createRequestSizeValidator({
  maxSize: '1mb',
  type: 'json',
  endpoint: 'analytics',
  severity: 'medium',
});

/**
 * COMPREHENSIVE REQUEST SIZE MIDDLEWARE
 * Applies different size limits based on content type and endpoint patterns
 */
export const comprehensiveRequestSizeValidation = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  const path = req.path.toLowerCase();
  const contentType = req.headers['content-type'] || '';

  // Determine appropriate size limit based on endpoint and content type
  let sizeLimit = '1mb'; // Default
  let endpoint = 'general';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  // Authentication endpoints (strict limits)
  if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
    sizeLimit = '100kb';
    endpoint = 'auth';
    severity = 'critical';
  }
  // File upload endpoints
  else if (path.includes('/upload') || path.includes('/files/') || contentType.includes('multipart/form-data')) {
    sizeLimit = '10mb';
    endpoint = 'file-upload';
    severity = 'high';
  }
  // Route optimization endpoints
  else if (path.includes('/route') || path.includes('/optimization')) {
    sizeLimit = '2mb';
    endpoint = 'route-optimization';
    severity = 'medium';
  }
  // Bulk import endpoints
  else if (path.includes('/bulk') || path.includes('/import')) {
    sizeLimit = '5mb';
    endpoint = 'bulk-import';
    severity = 'medium';
  }
  // User data endpoints
  else if (path.includes('/users/') || path.includes('/profile')) {
    sizeLimit = '500kb';
    endpoint = 'user-data';
    severity = 'high';
  }
  // Analytics endpoints
  else if (path.includes('/analytics') || path.includes('/metrics')) {
    sizeLimit = '1mb';
    endpoint = 'analytics';
    severity = 'medium';
  }

  // Create and apply the appropriate size validator
  const validator = createRequestSizeValidator({
    maxSize: sizeLimit,
    type: contentType.includes('application/json') ? 'json' : 'raw',
    endpoint,
    severity,
  });

  validator(req, res, next);
};

/**
 * REQUEST SIZE MONITORING MIDDLEWARE
 * Logs request size statistics for monitoring and optimization
 */
export const requestSizeMonitoring = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  
  // Log request size for monitoring (only for significant sizes)
  if (contentLength > 100 * 1024) { // Log requests > 100KB
    logger.debug("Large request size detected", {
      userId: authReq.user?.id,
      contentLength,
      contentLengthFormatted: `${Math.round(contentLength / 1024)}KB`,
      path: req.path,
      method: req.method,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  }

  // Add response headers for monitoring
  res.setHeader('X-Request-Size', contentLength.toString());
  res.setHeader('X-Request-Size-KB', Math.round(contentLength / 1024).toString());

  next();
};

/**
 * EMERGENCY REQUEST SIZE BLOCKER
 * Blocks extremely large requests that could crash the server
 */
export const emergencyRequestSizeBlocker = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const emergencyLimit = 50 * 1024 * 1024; // 50MB absolute maximum

  if (contentLength > emergencyLimit) {
    // Log critical security event
    logSecurityEvent(
      "emergency_request_size_blocked",
      {
        contentLength,
        emergencyLimit,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
      },
      authReq.user?.id,
      req.ip,
      "critical",
    );

    logger.error("Emergency request size limit exceeded - potential DoS attack", {
      userId: authReq.user?.id,
      ip: req.ip,
      contentLength,
      emergencyLimit,
      path: req.path,
    });

    return res.status(413).json({
      success: false,
      error: 'request_too_large',
      message: 'Request exceeds emergency size limit. Request blocked for security.',
      emergencyLimit: '50MB',
      actualSize: `${Math.round(contentLength / (1024 * 1024))}MB`,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * COMPLETE REQUEST SIZE SECURITY STACK
 * Comprehensive middleware stack for request size security
 */
export const requestSizeSecurityStack = [
  emergencyRequestSizeBlocker,
  requestSizeMonitoring,
  comprehensiveRequestSizeValidation,
];

// Export all validators for easy access
export default {
  // Core validators
  jsonSizeLimit,
  urlEncodedSizeLimit,
  rawSizeLimit,
  textSizeLimit,
  
  // Endpoint-specific validators
  fileUploadSizeLimit,
  authEndpointSizeLimit,
  userDataSizeLimit,
  routeOptimizationSizeLimit,
  bulkImportSizeLimit,
  analyticsSizeLimit,
  
  // Comprehensive middleware
  comprehensiveRequestSizeValidation,
  requestSizeMonitoring,
  emergencyRequestSizeBlocker,
  requestSizeSecurityStack,
  
  // Factory function
  createRequestSizeValidator,
};