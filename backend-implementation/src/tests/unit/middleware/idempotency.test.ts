import { Request, Response, NextFunction } from 'express';
import { idempotencyMiddleware } from '../../../middleware/idempotency';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('Idempotency Middleware', () => {
  let mockRedis: jest.Mocked<Redis>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    mockNext = jest.fn();

    mockRequest = {
      method: 'POST',
      headers: {},
      body: { test: 'data' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {}
    };

    // Mock Redis instance
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);
  });

  it('should proceed when idempotency key is provided and not cached', async () => {
    mockRequest.headers = { 'idempotency-key': 'test-key-123' };
    mockRedis.get.mockResolvedValue(null);

    const middleware = idempotencyMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRedis.get).toHaveBeenCalledWith('idempotency:test-key-123');
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.idempotencyKey).toBe('test-key-123');
  });

  it('should return cached response when idempotency key exists', async () => {
    const cachedResponse = {
      status: 201,
      body: { id: 'cached-id', message: 'Created' }
    };

    mockRequest.headers = { 'idempotency-key': 'existing-key' };
    mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse));

    const middleware = idempotencyMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(cachedResponse.body);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 400 when idempotency key is missing for POST requests', async () => {
    mockRequest.method = 'POST';
    mockRequest.headers = {};

    const middleware = idempotencyMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Idempotency-Key header is required for POST requests'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should skip idempotency check for GET requests', async () => {
    mockRequest.method = 'GET';
    mockRequest.headers = {};

    const middleware = idempotencyMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRedis.get).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle Redis errors gracefully', async () => {
    mockRequest.headers = { 'idempotency-key': 'test-key' };
    mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

    const middleware = idempotencyMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    // Should proceed despite Redis error
    expect(mockNext).toHaveBeenCalled();
  });

  it('should validate idempotency key format', async () => {
    mockRequest.headers = { 'idempotency-key': 'invalid key with spaces!' };

    const middleware = idempotencyMiddleware();
    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Invalid Idempotency-Key format'
    });
  });
});