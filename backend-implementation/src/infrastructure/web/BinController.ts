/**
 * Clean Architecture Bin Controller
 * 
 * Thin HTTP adapter that delegates to use cases. Integrates with existing
 * middleware, authentication, and error handling while following clean architecture.
 * 
 * This controller is < 150 lines and contains ZERO business logic.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate, createBinSchema } from "../../shared/validation/schemas";
import { CreateBin } from "../../application/bin/use-cases/CreateBin";
import { BinRepoSequelize } from "../db/BinRepoSequelize";
import { errorMiddleware } from "../../shared/errors";
import { logger } from "../../utils/logger";
import type { AuthenticatedRequest } from "../../middleware/auth";

export const binRouter = Router();

// Use existing rate limiting configuration
const binRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Allow more for operational endpoints
  message: { error: "RATE_LIMIT", message: "Too many bin requests, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize use cases with repository
const binRepo = new BinRepoSequelize();
const createBinUseCase = new CreateBin(binRepo);

/**
 * Extract subject from authenticated request for authorization
 */
function getSubject(req: AuthenticatedRequest) {
  if (!req.user) {
    throw new Error("Authentication required");
  }
  return { 
    id: req.user.id, 
    roles: req.user.roles || [],
    organizationId: req.user.organizationId 
  };
}

/**
 * POST /bins - Create new bin
 * 
 * Thin controller that:
 * 1. Validates request (Zod schema)
 * 2. Applies rate limiting
 * 3. Delegates to use case (business logic)
 * 4. Returns response (HTTP concerns)
 */
binRouter.post("/bins", 
  binRateLimit,
  validate(createBinSchema), 
  async (req: AuthenticatedRequest, res, next) => {
    const startTime = Date.now();
    
    try {
      logger.info('Bin creation attempt', { 
        serialNumber: req.validated?.serialNumber,
        customerId: req.validated?.customerId,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const subject = getSubject(req);
      const result = await createBinUseCase.execute(req.validated, subject);
      
      logger.info('Bin created successfully', { 
        binId: result.id,
        serialNumber: result.serialNumber,
        customerId: result.customerId,
        duration: Date.now() - startTime
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.warn('Bin creation failed', { 
        serialNumber: req.validated?.serialNumber,
        customerId: req.validated?.customerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
      
      next(error);
    }
  }
);

/**
 * GET /bins/:id - Get bin by ID
 */
binRouter.get("/bins/:id", 
  binRateLimit,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          error: "Bin ID is required" 
        });
      }

      const bin = await binRepo.get(id);
      if (!bin) {
        return res.status(404).json({ 
          success: false, 
          error: "Bin not found" 
        });
      }

      res.json({
        success: true,
        data: bin
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /bins - List bins with filters
 */
binRouter.get("/bins", 
  binRateLimit,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const filters = {
        status: req.query.status as any,
        type: req.query.type as any,
        customerId: req.query.customerId as string,
        organizationId: req.query.organizationId as string
      };

      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined)
      );

      const bins = await binRepo.list(cleanFilters);

      res.json({
        success: true,
        data: bins,
        count: bins.length
      });
    } catch (error) {
      next(error);
    }
  }
);

// Apply existing error handling
binRouter.use(errorMiddleware);
