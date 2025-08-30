import { Request, Response, NextFunction } from 'express';
import { etagMiddleware } from '../../../middleware/etagHandler';

describe('ETag Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn();

    mockRequest = {
      method: 'GET',
      headers: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      locals: {}
    };
  });

  it('should proceed for GET requests without If-Match header', async () => {
    mockRequest.method = 'GET';

    const middleware = etagMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should validate If-Match header for PUT requests', async () => {
    mockRequest.method = 'PUT';
    mockRequest.headers = {};

    const middleware = etagMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(428);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'If-Match header is required for updates'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should validate If-Match header for PATCH requests', async () => {
    mockRequest.method = 'PATCH';
    mockRequest.headers = { 'if-match': 'valid-etag-123' };

    const middleware = etagMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.ifMatch).toBe('valid-etag-123');
  });

  it('should reject invalid ETag format', async () => {
    mockRequest.method = 'PUT';
    mockRequest.headers = { 'if-match': 'invalid etag with spaces!' };

    const middleware = etagMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid If-Match header format'
    });
  });

  it('should handle weak ETags', async () => {
    mockRequest.method = 'PUT';
    mockRequest.headers = { 'if-match': 'W/"weak-etag-123"' };

    const middleware = etagMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.ifMatch).toBe('W/"weak-etag-123"');
  });

  it('should handle multiple ETags', async () => {
    mockRequest.method = 'PUT';
    mockRequest.headers = { 'if-match': '"etag1", "etag2", W/"etag3"' };

    const middleware = etagMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.ifMatch).toBe('"etag1", "etag2", W/"etag3"');
  });

  it('should handle wildcard ETag', async () => {
    mockRequest.method = 'PUT';
    mockRequest.headers = { 'if-match': '*' };

    const middleware = etagMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.ifMatch).toBe('*');
  });
});