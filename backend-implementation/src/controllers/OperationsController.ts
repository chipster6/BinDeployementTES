import type { Request, Response } from "express";
import { ok, err, precondition } from "../shared/ResponseHelper";

// Simple logger until full integration
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || '')
};

/**
 * Operations Controller - Contract-first API for bin lifecycle management
 * 
 * Implements the operations service API with:
 * - Idempotency support via Idempotency-Key header
 * - Optimistic concurrency via ETag/If-Match headers
 * - Tenant isolation via tenant_id context
 * - Event-driven architecture with outbox pattern
 * - TypeScript hook test - updated
 */
export class OperationsController {
  
  /**
   * GET /ops/bins - List bins with pagination and filtering
   */
  public static async listBins(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenant_id;
      
      // Extract query parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      
      // Filtering parameters
      const status = req.query.status as string;
      const binType = req.query.binType as string;
      const customerId = req.query.customerId as string;
      
      // TODO: Implement actual database query with tenant isolation
      // For now, return mock data to establish the contract
      const mockBins = [
        {
          id: "B-1",
          tenant_id: tenantId,
          serial_number: "SN-123",
          type: "ROLL_OFF",
          capacity_m3: 10.0,
          customer_id: "C-1",
          location: { lat: 45.5, lon: -73.6 },
          status: "ACTIVE",
          etag: "abc123",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z"
        }
      ];
      
      const filteredBins = mockBins.filter(bin => {
        if (status && bin.status !== status) return false;
        if (binType && bin.type !== binType) return false;
        if (customerId && bin.customer_id !== customerId) return false;
        return true;
      });
      
      const paginatedBins = filteredBins.slice(offset, offset + limit);
      
      logger.info("Bins listed", {
        tenant_id: tenantId,
        page,
        limit,
        total: filteredBins.length,
        filters: { status, binType, customerId }
      });
      
      ok(res, {
        bins: paginatedBins,
        pagination: {
          page,
          limit,
          total: filteredBins.length,
          pages: Math.ceil(filteredBins.length / limit)
        }
      });
      
    } catch (error: any) {
      logger.error("Error listing bins:", error);
      err(res, { 
        error: "INTERNAL_ERROR", 
        message: "Failed to list bins" 
      }, 500);
    }
  }
  
  /**
   * POST /ops/bins - Create new bin (idempotent)
   */
  public static async createBin(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenant_id;
      const idemKey = (req as any).idemKey;
      
      const {
        serial_number,
        type,
        capacity_m3,
        customer_id,
        location
      } = req.body;
      
      // Validate required fields
      if (!serial_number || !type || !capacity_m3 || !customer_id) {
        return err(res, {
          error: "VALIDATION_ERROR",
          message: "Missing required fields: serial_number, type, capacity_m3, customer_id"
        }, 400);
      }
      
      // TODO: Check idempotency in Redis
      // TODO: Validate customer exists and belongs to tenant
      // TODO: Check serial_number uniqueness within tenant
      // TODO: Create bin in database with transaction
      // TODO: Emit bin.created event to outbox
      
      const newBin = {
        id: `B-${Date.now()}`,
        tenant_id: tenantId,
        serial_number,
        type,
        capacity_m3,
        customer_id,
        location,
        status: "ACTIVE",
        etag: `etag-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      logger.info("Bin created", {
        tenant_id: tenantId,
        bin_id: newBin.id,
        serial_number,
        idempotency_key: idemKey
      });
      
      ok(res, { bin: newBin }, newBin.etag, 201);
      
    } catch (error: any) {
      logger.error("Error creating bin:", error);
      err(res, { 
        error: "INTERNAL_ERROR", 
        message: "Failed to create bin" 
      }, 500);
    }
  }
  
  /**
   * GET /ops/bins/{id} - Get bin by ID
   */
  public static async getBin(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenant_id;
      const { id } = req.params;
      
      // TODO: Query database with tenant isolation
      // For now, return mock data
      const mockBin = {
        id,
        tenant_id: tenantId,
        serial_number: "SN-123",
        type: "ROLL_OFF",
        capacity_m3: 10.0,
        customer_id: "C-1",
        location: { lat: 45.5, lon: -73.6 },
        status: "ACTIVE",
        etag: "abc123",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z"
      };
      
      logger.info("Bin retrieved", {
        tenant_id: tenantId,
        bin_id: id
      });
      
      ok(res, { bin: mockBin }, mockBin.etag);
      
    } catch (error: any) {
      logger.error("Error getting bin:", error);
      err(res, { 
        error: "INTERNAL_ERROR", 
        message: "Failed to get bin" 
      }, 500);
    }
  }
  
  /**
   * PATCH /ops/bins/{id} - Update bin (with ETag validation)
   */
  public static async updateBin(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenant_id;
      const expectedEtag = (req as any).expectedEtag;
      const { id } = req.params;
      
      // TODO: Query current bin with tenant isolation
      // TODO: Validate ETag matches current bin.etag
      // TODO: Update bin in database with new ETag
      // TODO: Emit bin.updated event to outbox
      
      const currentEtag = "abc123"; // Mock current ETag
      
      if (expectedEtag !== currentEtag) {
        return precondition(res, "ETag mismatch - bin was modified by another request");
      }
      
      const updatedBin = {
        id,
        tenant_id: tenantId,
        serial_number: req.body.serial_number || "SN-123",
        type: req.body.type || "ROLL_OFF",
        capacity_m3: req.body.capacity_m3 || 10.0,
        customer_id: req.body.customer_id || "C-1",
        location: req.body.location || { lat: 45.5, lon: -73.6 },
        status: req.body.status || "ACTIVE",
        etag: `etag-${Date.now()}`, // New ETag
        created_at: "2025-01-01T00:00:00Z",
        updated_at: new Date().toISOString()
      };
      
      logger.info("Bin updated", {
        tenant_id: tenantId,
        bin_id: id,
        expected_etag: expectedEtag
      });
      
      ok(res, { bin: updatedBin }, updatedBin.etag);
      
    } catch (error: any) {
      logger.error("Error updating bin:", error);
      err(res, { 
        error: "INTERNAL_ERROR", 
        message: "Failed to update bin" 
      }, 500);
    }
  }
  
  /**
   * POST /ops/bins/{id}/capacity - Update bin capacity (with ETag validation)
   */
  public static async updateCapacity(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenant_id;
      const expectedEtag = (req as any).expectedEtag;
      const { id } = req.params;
      const { capacity_m3 } = req.body;
      
      if (!capacity_m3 || capacity_m3 <= 0) {
        return err(res, {
          error: "VALIDATION_ERROR",
          message: "Invalid capacity_m3 value"
        }, 400);
      }
      
      // TODO: Query current bin with tenant isolation
      // TODO: Validate ETag matches current bin.etag
      // TODO: Update bin capacity in database with new ETag
      // TODO: Emit bin.capacity.updated event to outbox
      
      const currentEtag = "abc123"; // Mock current ETag
      
      if (expectedEtag !== currentEtag) {
        return precondition(res, "ETag mismatch - bin was modified by another request");
      }
      
      const updatedBin = {
        id,
        tenant_id: tenantId,
        capacity_m3,
        etag: `etag-${Date.now()}`, // New ETag
        updated_at: new Date().toISOString()
      };
      
      logger.info("Bin capacity updated", {
        tenant_id: tenantId,
        bin_id: id,
        capacity_m3,
        expected_etag: expectedEtag
      });
      
      ok(res, { bin: updatedBin }, updatedBin.etag);
      
    } catch (error: any) {
      logger.error("Error updating bin capacity:", error);
      err(res, { 
        error: "INTERNAL_ERROR", 
        message: "Failed to update bin capacity" 
      }, 500);
    }
  }
}