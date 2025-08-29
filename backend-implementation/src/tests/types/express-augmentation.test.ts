/**
 * Express Type Augmentation Tests
 * 
 * Tests to ensure Express type augmentation works correctly
 */

import { describe, it, expect } from '@jest/globals';
import { Request } from 'express';
import { isAuthenticatedRequest, assertAuthenticated, getAuthenticatedUser } from '@/utils/typeGuards';

describe('Express Type Augmentation', () => {
  it('should allow user property on Request interface', () => {
    const mockRequest = {
      user: {
        tenant_id: 'test-tenant',
        roles: ['admin'],
        scope: 'read:write'
      }
    } as Request;

    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.tenant_id).toBe('test-tenant');
    expect(mockRequest.user?.roles).toEqual(['admin']);
    expect(mockRequest.user?.scope).toBe('read:write');
  });

  it('should allow tenant_id property on Request interface', () => {
    const mockRequest = {
      tenant_id: 'test-tenant-123'
    } as Request;

    expect(mockRequest.tenant_id).toBe('test-tenant-123');
  });

  it('should allow idemKey property on Request interface', () => {
    const mockRequest = {
      idemKey: 'idempotency-key-123'
    } as Request;

    expect(mockRequest.idemKey).toBe('idempotency-key-123');
  });

  it('should allow expectedEtag property on Request interface', () => {
    const mockRequest = {
      expectedEtag: 'etag-value-123'
    } as Request;

    expect(mockRequest.expectedEtag).toBe('etag-value-123');
  });
});

describe('Type Guards with Express Augmentation', () => {
  it('should correctly identify authenticated requests', () => {
    const authenticatedRequest = {
      user: {
        tenant_id: 'test-tenant',
        roles: ['user'],
        scope: 'read'
      }
    } as Request;

    const unauthenticatedRequest = {} as Request;

    expect(isAuthenticatedRequest(authenticatedRequest)).toBe(true);
    expect(isAuthenticatedRequest(unauthenticatedRequest)).toBe(false);
  });

  it('should assert authentication correctly', () => {
    const authenticatedRequest = {
      user: {
        tenant_id: 'test-tenant',
        roles: ['user'],
        scope: 'read'
      }
    } as Request;

    const unauthenticatedRequest = {} as Request;

    expect(() => assertAuthenticated(authenticatedRequest)).not.toThrow();
    expect(() => assertAuthenticated(unauthenticatedRequest)).toThrow('User not authenticated');
  });

  it('should get authenticated user correctly', () => {
    const authenticatedRequest = {
      user: {
        tenant_id: 'test-tenant',
        roles: ['admin'],
        scope: 'read:write'
      }
    } as Request;

    const user = getAuthenticatedUser(authenticatedRequest);
    expect(user).toBeDefined();
    expect(user.tenant_id).toBe('test-tenant');
    expect(user.roles).toEqual(['admin']);
    expect(user.scope).toBe('read:write');
  });

  it('should throw when getting user from unauthenticated request', () => {
    const unauthenticatedRequest = {} as Request;

    expect(() => getAuthenticatedUser(unauthenticatedRequest)).toThrow('User not authenticated');
  });
});