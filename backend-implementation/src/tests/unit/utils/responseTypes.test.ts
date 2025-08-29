/**
 * ============================================================================
 * RESPONSE TYPES UNIT TESTS
 * ============================================================================
 * 
 * Tests for standardized API response types and utilities.
 * 
 * Created by: TypeScript Zero-Error Remediation (Phase 2)
 * Date: 2025-08-27
 */

import { ResponseHelper } from '@/utils/ResponseHelper';
import { SuccessResponse, ErrorResponse, ResponseFactory } from '@/utils/response';
import type { ApiResponse, PaginatedData, PaginationMeta } from '@/types/api';

// Mock Express Response
const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('Response Types Standardization', () => {
  describe('ResponseHelper', () => {
    let res: any;

    beforeEach(() => {
      res = mockResponse();
    });

    test('should create success response with correct structure', () => {
      const testData = { id: 1, name: 'Test' };
      const message = 'Success message';

      ResponseHelper.success(res, { data: testData, message });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message,
        data: testData,
        meta: undefined
      });
    });

    test('should create success response with meta data', () => {
      const testData = { id: 1, name: 'Test' };
      const meta = { executionTime: 100, version: '1.0' };

      ResponseHelper.success(res, { 
        data: testData, 
        message: 'Success with meta',
        meta 
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Success with meta',
        data: testData,
        meta
      });
    });

    test('should create error response with correct structure', () => {
      const message = 'Error message';
      const errors = [{ field: 'name', message: 'Required' }];

      ResponseHelper.error(res, { message, statusCode: 400, errors });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message,
        errors
      });
    });

    test('should create paginated response with correct structure', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const pagination: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        hasNextPage: false,
        hasPrevPage: false
      };

      ResponseHelper.paginated(res, items, pagination);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          items,
          pagination
        }
      });
    });

    test('should create standard HTTP responses', () => {
      // Test created response
      ResponseHelper.created(res, { id: 1 }, 'Created successfully');
      expect(res.status).toHaveBeenCalledWith(201);

      // Test not found response
      ResponseHelper.notFound(res, 'Resource not found');
      expect(res.status).toHaveBeenCalledWith(404);

      // Test unauthorized response
      ResponseHelper.unauthorized(res, 'Unauthorized access');
      expect(res.status).toHaveBeenCalledWith(401);

      // Test forbidden response
      ResponseHelper.forbidden(res, 'Forbidden access');
      expect(res.status).toHaveBeenCalledWith(403);

      // Test conflict response
      ResponseHelper.conflict(res, 'Resource conflict');
      expect(res.status).toHaveBeenCalledWith(409);

      // Test bad request response
      ResponseHelper.badRequest(res, 'Bad request', []);
      expect(res.status).toHaveBeenCalledWith(400);

      // Test internal error response
      ResponseHelper.internalError(res, 'Internal server error');
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('SuccessResponse Class', () => {
    test('should create success response instance', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Success';
      const meta = { version: '1.0' };

      const response = new SuccessResponse(data, message, meta);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe(message);
      expect(response.meta).toEqual(meta);
    });

    test('should create paginated success response', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const pagination: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        hasNextPage: false,
        hasPrevPage: false
      };

      const response = SuccessResponse.paginated(items, pagination, 'Paginated data');

      expect(response.success).toBe(true);
      expect(response.data?.items).toEqual(items);
      expect(response.data?.pagination).toEqual(pagination);
      expect(response.message).toBe('Paginated data');
    });
  });

  describe('ErrorResponse Class', () => {
    test('should create error response instance', () => {
      const message = 'Error occurred';
      const errors = [{ field: 'name', message: 'Required' }];
      const meta = { timestamp: '2025-08-27' };

      const response = new ErrorResponse(message, errors, meta);

      expect(response.success).toBe(false);
      expect(response.message).toBe(message);
      expect(response.errors).toEqual(errors);
      expect(response.meta).toEqual(meta);
    });

    test('should create validation error response', () => {
      const errors = [{ field: 'email', message: 'Invalid format' }];
      const response = ErrorResponse.validation(errors, 'Validation failed');

      expect(response.success).toBe(false);
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toEqual(errors);
    });
  });

  describe('ResponseFactory', () => {
    test('should create success response', () => {
      const data = { id: 1 };
      const response = ResponseFactory.success(data, 'Success', { version: '1.0' });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('Success');
      expect(response.meta).toEqual({ version: '1.0' });
    });

    test('should create error response', () => {
      const errors = [{ field: 'name', message: 'Required' }];
      const response = ResponseFactory.error('Error', errors, { timestamp: '2025-08-27' });

      expect(response.success).toBe(false);
      expect(response.message).toBe('Error');
      expect(response.errors).toEqual(errors);
      expect(response.meta).toEqual({ timestamp: '2025-08-27' });
    });

    test('should create paginated response', () => {
      const items = [{ id: 1 }];
      const pagination: PaginationMeta = {
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
        hasNextPage: false,
        hasPrevPage: false
      };

      const response = ResponseFactory.paginated(items, pagination, 'Paginated');

      expect(response.success).toBe(true);
      expect(response.data?.items).toEqual(items);
      expect(response.data?.pagination).toEqual(pagination);
      expect(response.message).toBe('Paginated');
    });
  });

  describe('Type Consistency', () => {
    test('should maintain consistent ApiResponse structure', () => {
      const successResponse: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
        message: 'Success',
        meta: { version: '1.0' }
      };

      const errorResponse: ApiResponse = {
        success: false,
        message: 'Error',
        errors: [{ field: 'name', message: 'Required' }]
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBeDefined();
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.errors).toBeDefined();
    });

    test('should maintain consistent PaginatedData structure', () => {
      const paginatedData: PaginatedData<{ id: number }> = {
        items: [{ id: 1 }, { id: 2 }],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      };

      expect(paginatedData.items).toHaveLength(2);
      expect(paginatedData.pagination.total).toBe(2);
    });
  });
});