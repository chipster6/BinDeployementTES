/**
 * ============================================================================
 * SHARED AUTHORIZATION - POLICY ENGINE
 * ============================================================================
 * 
 * Centralized authorization logic that can be used across all services.
 * Implements ABAC (Attribute-Based Access Control) patterns.
 */

import jwt from 'jsonwebtoken';
import type { 
  AuthorizeRequest, 
  AuthorizeResponse, 
  AuthorizationError,
  TraceContext 
} from '@waste-mgmt/types';

// =============================================================================
// POLICY DEFINITIONS
// =============================================================================

export interface PolicyContext {
  user: {
    id: string;
    role: string;
    organization_id: string;
    permissions: string[];
  };
  resource?: {
    type: string;
    id: string;
    organization_id?: string;
    owner_id?: string;
  };
  action: string;
  environment: {
    service: string;
    ip_address?: string;
    time: Date;
  };
}

export interface PolicyRule {
  name: string;
  description: string;
  condition: (context: PolicyContext) => boolean;
  priority: number; // Higher numbers = higher priority
}

// =============================================================================
// BUILT-IN POLICY RULES
// =============================================================================

export const BUILTIN_POLICIES: PolicyRule[] = [
  {
    name: 'admin_full_access',
    description: 'System administrators have full access',
    priority: 100,
    condition: (ctx) => ctx.user.role === 'system_admin'
  },
  {
    name: 'organization_isolation',
    description: 'Users can only access resources within their organization',
    priority: 90,
    condition: (ctx) => {
      if (!ctx.resource?.organization_id) return true; // No org constraint
      return ctx.user.organization_id === ctx.resource.organization_id;
    }
  },
  {
    name: 'resource_owner_access',
    description: 'Resource owners have full access to their resources',
    priority: 80,
    condition: (ctx) => {
      if (!ctx.resource?.owner_id) return false;
      return ctx.user.id === ctx.resource.owner_id;
    }
  },
  {
    name: 'role_based_permissions',
    description: 'Users must have required permissions for the action',
    priority: 70,
    condition: (ctx) => {
      const requiredPermission = `${ctx.resource?.type || 'system'}:${ctx.action}`;
      return ctx.user.permissions.includes(requiredPermission);
    }
  },
  {
    name: 'read_only_for_inactive',
    description: 'Inactive users can only read data',
    priority: 60,
    condition: (ctx) => {
      const readActions = ['read', 'list', 'view', 'get'];
      if (readActions.includes(ctx.action)) return true;
      
      // For non-read actions, check if user is active
      return ctx.user.permissions.includes('user:active');
    }
  }
];

// =============================================================================
// POLICY ENGINE
// =============================================================================

export class PolicyEngine {
  private rules: PolicyRule[] = [...BUILTIN_POLICIES];

  /**
   * Add custom policy rule
   */
  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority); // Sort by priority desc
  }

  /**
   * Remove policy rule by name
   */
  removeRule(name: string): void {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }

  /**
   * Evaluate all policies for a given context
   */
  evaluate(context: PolicyContext): {
    allowed: boolean;
    matched_rules: string[];
    denied_by?: string;
  } {
    const matchedRules: string[] = [];
    
    for (const rule of this.rules) {
      try {
        const result = rule.condition(context);
        
        if (result) {
          matchedRules.push(rule.name);
        } else {
          // First rule that denies access stops evaluation
          return {
            allowed: false,
            matched_rules: matchedRules,
            denied_by: rule.name
          };
        }
      } catch (error) {
        console.warn(`Policy rule '${rule.name}' threw error:`, error);
        // Treat policy errors as denial for security
        return {
          allowed: false,
          matched_rules: matchedRules,
          denied_by: rule.name
        };
      }
    }

    return {
      allowed: true,
      matched_rules: matchedRules
    };
  }
}

// =============================================================================
// JWT TOKEN UTILITIES
// =============================================================================

export interface TokenPayload {
  user_id: string;
  email: string;
  role: string;
  organization_id: string;
  permissions: string[];
  aud: string; // Audience - which service this token is for
  iss: string; // Issuer - auth service
  exp: number; // Expiration
  iat: number; // Issued at
}

export class TokenValidator {
  constructor(
    private secretOrPublicKey: string | Buffer,
    private defaultAudience: string = 'waste-management'
  ) {}

  /**
   * Verify and decode JWT token
   */
  verify(token: string, audience?: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.secretOrPublicKey, {
        audience: audience || this.defaultAudience,
        algorithms: ['RS256', 'HS256']
      }) as TokenPayload;

      return payload;
    } catch (error) {
      throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    
    return token;
  }
}

// =============================================================================
// AUTHORIZATION SERVICE CLIENT
// =============================================================================

export class AuthorizationClient {
  private policyEngine = new PolicyEngine();
  private tokenValidator: TokenValidator;

  constructor(
    jwtSecret: string | Buffer,
    audience: string = 'waste-management'
  ) {
    this.tokenValidator = new TokenValidator(jwtSecret, audience);
  }

  /**
   * Authorize request with token and required permissions
   */
  async authorize(
    token: string,
    action: string,
    resource?: {
      type: string;
      id: string;
      organization_id?: string;
      owner_id?: string;
    },
    context?: {
      service: string;
      ip_address?: string;
    }
  ): Promise<AuthorizeResponse> {
    try {
      // 1. Validate JWT token
      const payload = this.tokenValidator.verify(token);

      // 2. Build policy context
      const policyContext: PolicyContext = {
        user: {
          id: payload.user_id,
          role: payload.role,
          organization_id: payload.organization_id,
          permissions: payload.permissions
        },
        resource,
        action,
        environment: {
          service: context?.service || 'unknown',
          ip_address: context?.ip_address,
          time: new Date()
        }
      };

      // 3. Evaluate policies
      const result = this.policyEngine.evaluate(policyContext);

      return {
        authorized: result.allowed,
        user_id: payload.user_id,
        permissions: payload.permissions
      };

    } catch (error) {
      return {
        authorized: false,
        user_id: '',
        permissions: []
      };
    }
  }

  /**
   * Add custom policy rule
   */
  addPolicyRule(rule: PolicyRule): void {
    this.policyEngine.addRule(rule);
  }

  /**
   * Extract user context from token (without full authorization)
   */
  getCurrentUser(token: string): {
    user_id: string;
    role: string;
    organization_id: string;
    permissions: string[];
  } | null {
    try {
      const payload = this.tokenValidator.verify(token);
      return {
        user_id: payload.user_id,
        role: payload.role,
        organization_id: payload.organization_id,
        permissions: payload.permissions
      };
    } catch (error) {
      return null;
    }
  }
}

// =============================================================================
// EXPRESS MIDDLEWARE
// =============================================================================

export interface AuthMiddlewareOptions {
  required_permissions?: string[];
  resource_extractor?: (req: any) => {
    type: string;
    id: string;
    organization_id?: string;
    owner_id?: string;
  } | undefined;
  service_name: string;
}

export function createAuthMiddleware(
  authClient: AuthorizationClient,
  options: AuthMiddlewareOptions
) {
  return async (req: any, res: any, next: any) => {
    try {
      // Extract token from header
      const authHeader = req.headers.authorization;
      const token = authClient['tokenValidator'].extractFromHeader(authHeader);
      
      if (!token) {
        return res.status(401).json({
          error: 'authorization_required',
          message: 'Authorization token required'
        });
      }

      // Get action from HTTP method + route
      const action = req.method.toLowerCase();
      
      // Extract resource if extractor provided
      const resource = options.resource_extractor?.(req);

      // Authorize request
      const authResult = await authClient.authorize(
        token,
        action,
        resource,
        {
          service: options.service_name,
          ip_address: req.ip
        }
      );

      if (!authResult.authorized) {
        return res.status(403).json({
          error: 'access_denied',
          message: 'Insufficient permissions for this operation'
        });
      }

      // Add user context to request
      req.user = authClient.getCurrentUser(token);
      req.trace_context = {
        trace_id: req.headers['x-trace-id'] || `trace-${Date.now()}`,
        span_id: `span-${Date.now()}`,
        parent_span_id: req.headers['x-parent-span-id']
      };

      next();
    } catch (error) {
      res.status(500).json({
        error: 'authorization_error',
        message: 'Failed to authorize request'
      });
    }
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

// Classes and functions are exported inline above
// Types are exported inline above