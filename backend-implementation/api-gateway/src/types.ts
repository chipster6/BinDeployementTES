/**
 * Gateway-specific TypeScript definitions
 */

import type { TraceContext } from '@waste-mgmt/types';

declare global {
  namespace Express {
    interface Request {
      trace_context?: TraceContext;
      user?: {
        user_id: string;
        role: string;
        organization_id: string;
        permissions: string[];
      };
    }
  }
}