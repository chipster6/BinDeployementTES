import { Request } from 'express';
import { User } from '../models/User';

export function isAuthenticatedRequest(req: Request): req is Express.AuthenticatedRequest {
  return req.user !== undefined && req.user !== null;
}

export function assertAuthenticated(req: Request): asserts req is Express.AuthenticatedRequest {
  if (!isAuthenticatedRequest(req)) {
    throw new Error('User not authenticated');
  }
}

export function getAuthenticatedUser(req: Request): User {
  assertAuthenticated(req);
  return req.user;
}
