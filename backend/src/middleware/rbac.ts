/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - ROLE-BASED ACCESS CONTROL MIDDLEWARE
 * ============================================================================
 * Advanced RBAC middleware with resource-level permissions
 * Based on: artifacts/security-requirements.yml
 */

import { Request, Response, NextFunction } from 'express';
import { database } from '../config/database';
import { logger } from '../utils/logger';
import { createApiError } from '../utils/errors';

export interface PermissionContext {
  resource: string;
  action: string;
  resourceId?: string;
  organizationId?: string;
  territoryId?: string;
}

/**
 * Basic role-based middleware that checks if user has required role
 */
export const rbacMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required for this operation');
      }

      // Super admin has access to everything
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Access denied - insufficient role', {
          component: 'rbac',
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          resource: req.path,
          action: req.method
        });

        throw createApiError(403, 'INSUFFICIENT_PERMISSIONS', 
          `Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Advanced permission-based middleware that checks specific permissions
 */
export const permissionMiddleware = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required for this operation');
      }

      // Super admin has all permissions
      if (req.user.permissions.includes('*')) {
        return next();
      }

      // Check if user has the specific permission
      if (!hasPermission(req.user.permissions, requiredPermission)) {
        logger.warn('Access denied - missing permission', {
          component: 'rbac',
          userId: req.user.id,
          userRole: req.user.role,
          requiredPermission,
          userPermissions: req.user.permissions,
          resource: req.path,
          action: req.method
        });

        throw createApiError(403, 'INSUFFICIENT_PERMISSIONS', 
          `Access denied. Required permission: ${requiredPermission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Resource ownership middleware - ensures users can only access their own resources
 */
export const ownershipMiddleware = (resourceType: 'customer' | 'driver' | 'organization') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      }

      // Super admin and admin can access all resources
      if (['super_admin', 'admin'].includes(req.user.role)) {
        return next();
      }

      const resourceId = req.params.id || req.params.customerId || req.params.driverId;
      if (!resourceId) {
        throw createApiError(400, 'MISSING_RESOURCE_ID', 'Resource ID is required');
      }

      let isOwner = false;

      switch (resourceType) {
        case 'customer':
          isOwner = await checkCustomerOwnership(req.user.id, resourceId);
          break;
        case 'driver':
          isOwner = await checkDriverOwnership(req.user.id, resourceId);
          break;
        case 'organization':
          isOwner = await checkOrganizationOwnership(req.user.id, resourceId);
          break;
      }

      if (!isOwner) {
        logger.warn('Access denied - not resource owner', {
          component: 'rbac',
          userId: req.user.id,
          resourceType,
          resourceId,
          action: req.method,
          path: req.path
        });

        throw createApiError(403, 'ACCESS_DENIED', 'You can only access your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Territory-based access control middleware
 */
export const territoryMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      }

      // Super admin and admin can access all territories
      if (['super_admin', 'admin'].includes(req.user.role)) {
        return next();
      }

      // For dispatcher role, check territory assignment
      if (req.user.role === 'dispatcher') {
        const userTerritories = await getUserTerritories(req.user.id);
        const requestedTerritory = req.params.territory || req.query.territory;

        if (requestedTerritory && !userTerritories.includes(requestedTerritory as string)) {
          throw createApiError(403, 'TERRITORY_ACCESS_DENIED', 
            'Access denied to this territory');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Time-based access control middleware
 */
export const timeBasedMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      }

      // Super admin can access anytime
      if (req.user.role === 'super_admin') {
        return next();
      }

      const now = new Date();
      const hour = now.getHours();

      // Business hours check for office staff (9 AM - 6 PM)
      if (req.user.role === 'office_staff') {
        if (hour < 9 || hour >= 18) {
          throw createApiError(403, 'OUTSIDE_BUSINESS_HOURS', 
            'Access restricted to business hours (9 AM - 6 PM)');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Data sensitivity middleware for PII and financial data
 */
export const dataSensitivityMiddleware = (sensitivityLevel: 'pii' | 'financial' | 'confidential') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      }

      // Log access to sensitive data
      await logSensitiveDataAccess(req.user.id, sensitivityLevel, req.path, req.method);

      // Financial data requires additional verification
      if (sensitivityLevel === 'financial' && !['super_admin', 'admin'].includes(req.user.role)) {
        throw createApiError(403, 'FINANCIAL_DATA_ACCESS_DENIED', 
          'Access to financial data restricted to admin roles');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * IP-based access control middleware
 */
export const ipWhitelistMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      }

      // IP whitelist only for super_admin and admin
      if (['super_admin', 'admin'].includes(req.user.role)) {
        const clientIP = req.ip;
        const allowedIPs = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

        if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
          logger.warn('Access denied - IP not whitelisted', {
            component: 'rbac',
            userId: req.user.id,
            clientIP,
            allowedIPs: allowedIPs.length
          });

          throw createApiError(403, 'IP_NOT_WHITELISTED', 
            'Access denied from this IP address');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Audit logging middleware for sensitive operations
 */
export const auditLogMiddleware = (operation: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw createApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      }

      // Log the operation attempt
      await database('audit.data_access_logs').insert({
        table_name: extractTableFromPath(req.path),
        record_id: req.params.id || null,
        action: req.method,
        user_id: req.user.id,
        session_id: req.user.sessionId,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        sensitive_data_accessed: isSensitivePath(req.path),
        access_timestamp: new Date()
      });

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Helper functions

/**
 * Check if user has a specific permission (supports wildcards)
 */
function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  // Check for exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard permissions
  for (const permission of userPermissions) {
    if (permission.endsWith('*')) {
      const prefix = permission.slice(0, -1);
      if (requiredPermission.startsWith(prefix)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if user owns a customer resource
 */
async function checkCustomerOwnership(userId: string, customerId: string): Promise<boolean> {
  const customer = await database('customers')
    .join('organizations', 'customers.organization_id', 'organizations.id')
    .where('customers.id', customerId)
    .andWhere('organizations.primary_contact_id', userId)
    .first();

  return !!customer;
}

/**
 * Check if user owns a driver resource
 */
async function checkDriverOwnership(userId: string, driverId: string): Promise<boolean> {
  const driver = await database('drivers')
    .where('id', driverId)
    .andWhere('user_id', userId)
    .first();

  return !!driver;
}

/**
 * Check if user owns an organization resource
 */
async function checkOrganizationOwnership(userId: string, organizationId: string): Promise<boolean> {
  const organization = await database('organizations')
    .where('id', organizationId)
    .andWhere('primary_contact_id', userId)
    .first();

  return !!organization;
}

/**
 * Get territories assigned to a user
 */
async function getUserTerritories(userId: string): Promise<string[]> {
  // This would be implemented based on your territory assignment logic
  // For now, returning empty array
  return [];
}

/**
 * Log access to sensitive data for compliance
 */
async function logSensitiveDataAccess(
  userId: string, 
  sensitivityLevel: string, 
  path: string, 
  method: string
): Promise<void> {
  try {
    await database('audit.data_access_logs').insert({
      table_name: extractTableFromPath(path),
      record_id: null,
      action: method,
      user_id: userId,
      ip_address: null, // Would be set by the calling middleware
      user_agent: null,
      sensitive_data_accessed: true,
      access_timestamp: new Date()
    });

    logger.info('Sensitive data access logged', {
      component: 'rbac',
      userId,
      sensitivityLevel,
      path,
      method
    });
  } catch (error) {
    logger.error('Failed to log sensitive data access', { error });
  }
}

/**
 * Extract table name from API path
 */
function extractTableFromPath(path: string): string {
  const pathParts = path.split('/');
  const resourceIndex = pathParts.findIndex(part => part === 'api') + 2; // Skip 'api' and version
  return pathParts[resourceIndex] || 'unknown';
}

/**
 * Check if path accesses sensitive data
 */
function isSensitivePath(path: string): boolean {
  const sensitivePaths = [
    '/api/v1/payments',
    '/api/v1/invoices',
    '/api/v1/customers',
    '/api/v1/analytics'
  ];

  return sensitivePaths.some(sensitivePath => path.startsWith(sensitivePath));
}

export default {
  rbacMiddleware,
  permissionMiddleware,
  ownershipMiddleware,
  territoryMiddleware,
  timeBasedMiddleware,
  dataSensitivityMiddleware,
  ipWhitelistMiddleware,
  auditLogMiddleware
};