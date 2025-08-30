import { BinService } from '../../../services/BinService';
import { Bin } from '../../../models/Bin';
import Redis from 'ioredis';

// Mock dependencies
jest.mock('../../../models/Bin');
jest.mock('ioredis');

describe('BinService', () => {
  let binService: BinService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>;
    binService = new BinService();
    (binService as any).redis = mockRedis;
  });

  describe('createBin', () => {
    it('should create a bin successfully', async () => {
      const binData = {
        type: 'recycling',
        capacity: 100,
        location: { lat: 40.7128, lng: -74.0060 }
      };

      const createdBin = {
        id: 'bin-123',
        ...binData,
        tenantId: 'tenant-123',
        etag: 'etag-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (Bin.create as jest.Mock).mockResolvedValue(createdBin);
      mockRedis.setex.mockResolvedValue('OK');

      const result = await binService.createBin(binData, 'tenant-123', 'idem-123');

      expect(Bin.create).toHaveBeenCalledWith({
        ...binData,
        tenantId: 'tenant-123',
        etag: expect.any(String)
      });
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'idempotency:idem-123',
        3600,
        JSON.stringify({ status: 201, body: createdBin })
      );
      expect(result).toEqual(createdBin);
    });

    it('should handle validation errors', async () => {
      const binData = { type: 'invalid' };

      (Bin.create as jest.Mock).mockRejectedValue(new Error('Validation failed'));

      await expect(binService.createBin(binData, 'tenant-123', 'idem-123'))
        .rejects.toThrow('Validation failed');
    });
  });

  describe('getBins', () => {
    it('should return paginated bins', async () => {
      const bins = [
        { id: 'bin-1', type: 'recycling', capacity: 100 },
        { id: 'bin-2', type: 'waste', capacity: 200 }
      ];

      (Bin.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: bins,
        count: 2
      });

      const result = await binService.getBins('tenant-123', { page: 1, limit: 10 });

      expect(Bin.findAndCountAll).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123' },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']]
      });

      expect(result).toEqual({
        data: bins,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      });
    });

    it('should handle filtering by type', async () => {
      const bins = [{ id: 'bin-1', type: 'recycling', capacity: 100 }];

      (Bin.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: bins,
        count: 1
      });

      await binService.getBins('tenant-123', { 
        page: 1, 
        limit: 10, 
        type: 'recycling' 
      });

      expect(Bin.findAndCountAll).toHaveBeenCalledWith({
        where: { 
          tenantId: 'tenant-123',
          type: 'recycling'
        },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']]
      });
    });
  });

  describe('getBin', () => {
    it('should return a specific bin', async () => {
      const bin = {
        id: 'bin-123',
        type: 'recycling',
        capacity: 100,
        tenantId: 'tenant-123',
        etag: 'etag-123'
      };

      (Bin.findOne as jest.Mock).mockResolvedValue(bin);

      const result = await binService.getBin('bin-123', 'tenant-123');

      expect(Bin.findOne).toHaveBeenCalledWith({
        where: {
          id: 'bin-123',
          tenantId: 'tenant-123'
        }
      });
      expect(result).toEqual(bin);
    });

    it('should return null for non-existent bin', async () => {
      (Bin.findOne as jest.Mock).mockResolvedValue(null);

      const result = await binService.getBin('non-existent', 'tenant-123');

      expect(result).toBeNull();
    });
  });

  describe('updateBin', () => {
    it('should update a bin with ETag validation', async () => {
      const existingBin = {
        id: 'bin-123',
        type: 'recycling',
        capacity: 100,
        etag: 'old-etag',
        update: jest.fn(),
        save: jest.fn()
      };

      const updateData = { capacity: 150 };

      (Bin.findOne as jest.Mock).mockResolvedValue(existingBin);
      existingBin.save.mockResolvedValue({
        ...existingBin,
        capacity: 150,
        etag: 'new-etag'
      });

      const result = await binService.updateBin(
        'bin-123',
        updateData,
        'tenant-123',
        'old-etag'
      );

      expect(Bin.findOne).toHaveBeenCalledWith({
        where: {
          id: 'bin-123',
          tenantId: 'tenant-123'
        }
      });
      expect(existingBin.update).toHaveBeenCalledWith({
        ...updateData,
        etag: expect.any(String)
      });
      expect(result.capacity).toBe(150);
    });

    it('should throw error for ETag mismatch', async () => {
      const existingBin = {
        id: 'bin-123',
        etag: 'current-etag'
      };

      (Bin.findOne as jest.Mock).mockResolvedValue(existingBin);

      await expect(binService.updateBin(
        'bin-123',
        { capacity: 150 },
        'tenant-123',
        'wrong-etag'
      )).rejects.toThrow('ETag mismatch');
    });

    it('should throw error for non-existent bin', async () => {
      (Bin.findOne as jest.Mock).mockResolvedValue(null);

      await expect(binService.updateBin(
        'non-existent',
        { capacity: 150 },
        'tenant-123',
        'etag'
      )).rejects.toThrow('Bin not found');
    });
  });

  describe('deleteBin', () => {
    it('should delete a bin successfully', async () => {
      const existingBin = {
        id: 'bin-123',
        destroy: jest.fn().mockResolvedValue(true)
      };

      (Bin.findOne as jest.Mock).mockResolvedValue(existingBin);

      const result = await binService.deleteBin('bin-123', 'tenant-123');

      expect(Bin.findOne).toHaveBeenCalledWith({
        where: {
          id: 'bin-123',
          tenantId: 'tenant-123'
        }
      });
      expect(existingBin.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false for non-existent bin', async () => {
      (Bin.findOne as jest.Mock).mockResolvedValue(null);

      const result = await binService.deleteBin('non-existent', 'tenant-123');

      expect(result).toBe(false);
    });
  });
});