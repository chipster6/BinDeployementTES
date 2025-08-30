import { Request, Response, NextFunction } from 'express';
import { tenantValidationMiddleware } from '../../../middleware/tenantValidation';

describe('Tenant Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn();

    mockRequest = {
      user: {},
      params: {},
      body: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('should proceed when user has valid tenant', async () => {
    mockRequest.user = { tenantId: 'valid-tenant-123', sub: 'user-123' };

    const middleware = tenantValidationMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 401 when user is not authenticated', async () => {
    mockRequest.user = undefined;

    const middleware = tenantValidationMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Authentication required'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 when user has no tenant', async () => {
    mockRequest.user = { sub: 'user-123' };

    const middleware = tenantValidationMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Tenant access required'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should validate tenant format', async () => {
    mockRequest.user = { tenantId: 'invalid tenant!', sub: 'user-123' };

    const middleware = tenantValidationMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid tenant format'
    });
  });

  it('should validate tenant in request body matches user tenant', async () => {
    mockRequest.user = { tenantId: 'tenant-123', sub: 'user-123' };
    mockRequest.body = { tenantId: 'different-tenant' };

    const middleware = tenantValidationMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Tenant mismatch'
    });
  });

  it('should allow request when body tenant matches user tenant', async () => {
    mockRequest.user = { tenantId: 'tenant-123', sub: 'user-123' };
    mockRequest.body = { tenantId: 'tenant-123', data: 'test' };

    const middleware = tenantValidationMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});