import { Request } from 'express';
import { User } from '../models/User';

// Type guard to check if request has authenticated user
export function isAuthenticatedRequest(req: Request): req is Request & { user: Express.UserClaims } {
  return req.user !== undefined && req.user !== null;
}

// Assertion function for authenticated requests
export function assertAuthenticated(req: Request): asserts req is Request & { user: Express.UserClaims } {
  if (!isAuthenticatedRequest(req)) {
    throw new Error('User not authenticated');
  }
}

// Helper to get authenticated user from request
export function getAuthenticatedUser(req: Request): Express.UserClaims {
  assertAuthenticated(req);
  return req.user;
}
