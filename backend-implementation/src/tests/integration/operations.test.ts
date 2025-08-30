import request from 'supertest';
import { app } from '../../app';
import { Bin } from '../../models/Bin';
import jwt from 'jsonwebtoken';

// Mock the database
jest.mock('../../models/Bin');

describe('Operations API Integration Tests', () => {
  let authToken: string;

  beforeEach(() => {
    // Create a valid JWT token for testing
    authToken = jwt.sign(
      { 
        sub: 'test-user-123',
        tenantId: 'test-tenant-123',
        aud: 'operations',
        scope: 'bins:read bins:write'
      },
      'test-secret',
      { expiresIn: '1h' }
    );

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('POST /ops/bins', () => {
    it('should create a bin successfully', async () => {
      const binData = {
        type: 'recycling',
        capacity: 100,
        location: { lat: 40.7128, lng: -74.0060 }
      };

      const createdBin = {
        id: 'bin-123',
        ...binData,
        tenantId: 'test-tenant-123',
        etag: 'etag-123'
      };

      (Bin.create as jest.Mock).mockResolvedValue(createdBin);

      const response = await request(app)
        .post('/ops/bins')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', 'test-idem-123')
        .send(binData);

      expect(response.status).toBe(201);
      expect(response.headers.etag).toBe('etag-123');
      expect(response.body).toMatchObject(binData);
      expect(response.body.id).toBe('bin-123');
    });

    it('should return 400 when idempotency key is missing', async () => {
      const response = await request(app)
        .post('/ops/bins')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'recycling', capacity: 100 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Idempotency-Key');
    });

    it('should return 401 when authorization is missing', async () => {
      const response = await request(app)
        .post('/ops/bins')
        .set('Idempotency-Key', 'test-idem-123')
        .send({ type: 'recycling', capacity: 100 });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid bin data', async () => {
      const response = await request(app)
        .post('/ops/bins')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Idempotency-Key', 'test-idem-123')
        .send({ type: 'invalid-type' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /ops/bins', () => {
    it('should return paginated bins', async () => {
      const bins = [
        { id: 'bin-1', type: 'recycling', capacity: 100 },
        { id: 'bin-2', type: 'waste', capacity: 200 }
      ];

      (Bin.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: bins,
        count: 2
      });

      const response = await request(app)
        .get('/ops/bins')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(bins);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('should filter bins by type', async () => {
      const recyclingBins = [
        { id: 'bin-1', type: 'recycling', capacity: 100 }
      ];

      (Bin.findAndCountAll as jest.Mock).mockResolvedValue({
        rows: recyclingBins,
        count: 1
      });

      const response = await request(app)
        .get('/ops/bins')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'recycling' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(recyclingBins);
    });
  });

  describe('GET /ops/bins/:id', () => {
    it('should return a specific bin', async () => {
      const bin = {
        id: 'bin-123',
        type: 'recycling',
        capacity: 100,
        etag: 'etag-123'
      };

      (Bin.findOne as jest.Mock).mockResolvedValue(bin);

      const response = await request(app)
        .get('/ops/bins/bin-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers.etag).toBe('etag-123');
      expect(response.body).toEqual(bin);
    });

    it('should return 404 for non-existent bin', async () => {
      (Bin.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/ops/bins/non-existent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /ops/bins/:id', () => {
    it('should update a bin successfully', async () => {
      const existingBin = {
        id: 'bin-123',
        type: 'recycling',
        capacity: 100,
        etag: 'old-etag',
        update: jest.fn(),
        save: jest.fn()
      };

      const updatedBin = {
        ...existingBin,
        capacity: 150,
        etag: 'new-etag'
      };

      (Bin.findOne as jest.Mock).mockResolvedValue(existingBin);
      existingBin.save.mockResolvedValue(updatedBin);

      const response = await request(app)
        .patch('/ops/bins/bin-123')
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', 'old-etag')
        .send({ capacity: 150 });

      expect(response.status).toBe(200);
      expect(response.headers.etag).toBe('new-etag');
      expect(response.body.capacity).toBe(150);
    });

    it('should return 428 when If-Match header is missing', async () => {
      const response = await request(app)
        .patch('/ops/bins/bin-123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ capacity: 150 });

      expect(response.status).toBe(428);
    });

    it('should return 412 for ETag mismatch', async () => {
      const existingBin = {
        id: 'bin-123',
        etag: 'current-etag'
      };

      (Bin.findOne as jest.Mock).mockResolvedValue(existingBin);

      const response = await request(app)
        .patch('/ops/bins/bin-123')
        .set('Authorization', `Bearer ${authToken}`)
        .set('If-Match', 'wrong-etag')
        .send({ capacity: 150 });

      expect(response.status).toBe(412);
    });
  });

  describe('DELETE /ops/bins/:id', () => {
    it('should delete a bin successfully', async () => {
      const existingBin = {
        id: 'bin-123',
        destroy: jest.fn().mockResolvedValue(true)
      };

      (Bin.findOne as jest.Mock).mockResolvedValue(existingBin);

      const response = await request(app)
        .delete('/ops/bins/bin-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
      expect(existingBin.destroy).toHaveBeenCalled();
    });

    it('should return 404 for non-existent bin', async () => {
      (Bin.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/ops/bins/non-existent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});