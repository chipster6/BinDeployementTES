import { Router } from "express";
import { OperationsController } from "@/controllers/OperationsController";
import { requireTenant } from "@/middleware/requireTenant";
import { requireIdempotencyKey } from "@/middleware/requireIdempotencyKey";
import { requireIfMatch } from "@/middleware/requireIfMatch";

const router = Router();

/**
 * Operations API Routes - Contract-first implementation
 * 
 * All routes require tenant context and follow the operations API contract.
 * Idempotency and concurrency control are enforced via middleware.
 */

// Apply tenant middleware to all operations routes
router.use(requireTenant());

/**
 * Bin Management Routes
 */

// GET /ops/bins - List bins with pagination and filtering
router.get("/bins", OperationsController.listBins);

// POST /ops/bins - Create new bin (idempotent)
router.post("/bins", 
  requireIdempotencyKey(),
  OperationsController.createBin
);

// GET /ops/bins/{id} - Get bin by ID
router.get("/bins/:id", OperationsController.getBin);

// PATCH /ops/bins/{id} - Update bin (with ETag validation)
router.patch("/bins/:id",
  requireIfMatch(),
  OperationsController.updateBin
);

// POST /ops/bins/{id}/capacity - Update bin capacity (with ETag validation)
router.post("/bins/:id/capacity",
  requireIfMatch(),
  OperationsController.updateCapacity
);

export default router;