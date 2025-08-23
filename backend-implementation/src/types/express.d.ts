/**
 * ============================================================================
 * EXPRESS TYPE EXTENSIONS
 * ============================================================================
 * 
 * Extends Express Request interface with User model properties for 100% 
 * TypeScript compliance across all controllers and middleware.
 */

import { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};