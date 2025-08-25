/**
 * ============================================================================
 * REQUIRE USER MIDDLEWARE
 * ============================================================================
 *
 * Middleware helper to ensure authenticated user is present on request.
 * Provides standardized user validation for protected routes.
 *
 * Created by: TypeScript Implementation Specialist
 * Date: 2025-08-25
 * Version: 1.0.0
 */

import { RequestHandler } from 'express';
import { ResponseHelper } from '@/utils/ResponseHelper';

/**
 * Middleware to require authenticated user
 * 
 * Validates that req.user exists and has required properties.
 * Should be used after authenticateToken middleware.
 */
export const requireUser: RequestHandler = (req, res, next) => {
  if (!req.user?.id) {
    return ResponseHelper.error(res, {
      message: 'Authentication required. User not found.',
      statusCode: 401
    });
  }
  
  next();
};

/**
 * Middleware factory to require user with specific role
 */
export const requireUserWithRole = (role: string): RequestHandler => {
  return (req, res, next) => {
    if (!req.user?.id) {
      return ResponseHelper.error(res, {
        message: 'Authentication required. User not found.',
        statusCode: 401
      });
    }
    
    if (req.user.role !== role) {
      return ResponseHelper.error(res, {
        message: `Access denied. Required role: ${role}`,
        statusCode: 403
      });
    }
    
    next();
  };
};

/**
 * Middleware to require user with organization access
 */
export const requireUserWithOrganization: RequestHandler = (req, res, next) => {
  if (!req.user?.id) {
    return ResponseHelper.error(res, {
      message: 'Authentication required. User not found.',
      statusCode: 401
    });
  }
  
  if (!req.user.organizationId) {
    return ResponseHelper.error(res, {
      message: 'Organization access required.',
      statusCode: 403
    });
  }
  
  next();
};

export default requireUser;