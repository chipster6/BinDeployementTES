import { Request, Response } from 'express';
import { OperationsController } from '../../../controllers/OperationsController';

// Mock the response helper functions
jest.mock('../../../shared/ResponseHelper', () => ({
  ok: jest.fn(),
  err: jest.fn(),
  precondition: jest.fn()
}));

import { ok, err, precondition } from '../../../shared/ResponseHelper';

describe('OperationsController', () => {
  let mockRequest: Request;
  let mockResponse: Partial<Response>;
  let mockOk: jest.MockedFunction<typeof ok>;
  let mockErr: jest.MockedFunction<typeof err>;
  let mockPrecondition: jest.MockedFunction<typeof precondition>;

  beforeEach(() => {
    mockOk = ok as jest.MockedFunction<typeof ok>;
    mockErr = err as jest.MockedFunction<typeof err>;
    mockPrecondition = precondition as jest.MockedFunction<typeof precondition>;

    // Reset mocks
    mockOk.mockClear();
    mockErr.mockClear();
    mockPrecondition.mockClear();

    mockRequest = {
      params: {},
      body: {},
      query: {},
      headers: {},
      tenant_id: 'test-tenant',
      user: { tenant_id: 'test-tenant' },
      idemKey: undefined,
      expectedEtag: undefined
    } as Request;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    } as Partial<Response>;
  });

  describe('createBin', () => {
    it('should create a bin successfully', async () => {
      const binData = {
        serial_number: 'SN-123',
        type: 'ROLL_OFF',
        capacity_m3: 10.0,
        customer_id: 'C-1',
        location: { lat: 40.7128, lng: -74.0060 }
      };

      mockRequest.body = binData;
      mockRequest.idemKey = 'idem-123';

      await OperationsController.createBin(mockRequest, mockResponse as Response);

      expect(mockOk).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          bin: expect.objectContaining({
            serial_number: 'SN-123',
            type: 'ROLL_OFF',
            capacity_m3: 10.0,
            customer_id: 'C-1'
          })
        }),
        expect.any(String),
        201
      );
    });

    it('should handle validation errors', async () => {
      mockRequest.body = { type: 'invalid' };

      await OperationsController.createBin(mockRequest, mockResponse as Response);

      expect(mockErr).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: expect.stringContaining('Missing required fields')
        }),
        400
      );
    });
  });

  describe('listBins', () => {
    it('should return paginated bins', async () => {
      mockRequest.query = { page: '1', limit: '10' };

      await OperationsController.listBins(mockRequest, mockResponse as Response);

      expect(mockOk).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          bins: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
            pages: expect.any(Number)
          })
        })
      );
    });

    it('should handle filtering parameters', async () => {
      mockRequest.query = { 
        page: '1', 
        limit: '10',
        status: 'ACTIVE',
        binType: 'ROLL_OFF',
        customerId: 'C-1'
      };

      await OperationsController.listBins(mockRequest, mockResponse as Response);

      expect(mockOk).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          bins: expect.any(Array),
          pagination: expect.any(Object)
        })
      );
    });
  });

  describe('getBin', () => {
    it('should return a specific bin', async () => {
      mockRequest.params = { id: 'bin-123' };

      await OperationsController.getBin(mockRequest as Request, mockResponse as Response);

      expect(mockOk).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          bin: expect.objectContaining({
            id: 'bin-123',
            tenant_id: 'test-tenant'
          })
        }),
        expect.any(String)
      );
    });
  });

  describe('updateBin', () => {
    it('should update a bin with ETag validation', async () => {
      const updateData = { capacity_m3: 15.0 };

      mockRequest.params = { id: 'bin-123' };
      mockRequest.body = updateData;
      mockRequest.expectedEtag = 'abc123';

      await OperationsController.updateBin(mockRequest as Request, mockResponse as Response);

      expect(mockOk).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          bin: expect.objectContaining({
            id: 'bin-123',
            capacity_m3: 15.0
          })
        }),
        expect.any(String)
      );
    });

    it('should return 412 for ETag mismatch', async () => {
      mockRequest.params = { id: 'bin-123' };
      mockRequest.body = { capacity_m3: 15.0 };
      mockRequest.expectedEtag = 'wrong-etag';

      await OperationsController.updateBin(mockRequest as Request, mockResponse as Response);

      expect(mockPrecondition).toHaveBeenCalledWith(
        mockResponse,
        'ETag mismatch - bin was modified by another request'
      );
    });
  });

  describe('updateCapacity', () => {
    it('should update bin capacity with ETag validation', async () => {
      const capacityData = { capacity_m3: 12.5 };

      mockRequest.params = { id: 'bin-123' };
      mockRequest.body = capacityData;
      mockRequest.expectedEtag = 'abc123';

      await OperationsController.updateCapacity(mockRequest as Request, mockResponse as Response);

      expect(mockOk).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          bin: expect.objectContaining({
            id: 'bin-123',
            capacity_m3: 12.5
          })
        }),
        expect.any(String)
      );
    });

    it('should handle invalid capacity values', async () => {
      mockRequest.params = { id: 'bin-123' };
      mockRequest.body = { capacity_m3: -5 };
      mockRequest.expectedEtag = 'abc123';

      await OperationsController.updateCapacity(mockRequest as Request, mockResponse as Response);

      expect(mockErr).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          message: 'Invalid capacity_m3 value'
        }),
        400
      );
    });

    it('should return 412 for ETag mismatch', async () => {
      mockRequest.params = { id: 'bin-123' };
      mockRequest.body = { capacity_m3: 12.5 };
      mockRequest.expectedEtag = 'wrong-etag';

      await OperationsController.updateCapacity(mockRequest as Request, mockResponse as Response);

      expect(mockPrecondition).toHaveBeenCalledWith(
        mockResponse,
        'ETag mismatch - bin was modified by another request'
      );
    });
  });
});