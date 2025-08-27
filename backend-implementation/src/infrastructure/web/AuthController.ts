/**
 * Clean Architecture Auth Controller
 * 
 * Thin HTTP adapter that delegates to use cases. Integrates with existing
 * middleware, rate limiting, and error handling while following clean architecture.
 * 
 * This controller is < 150 lines and contains ZERO business logic.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate, loginSchema } from "../../shared/validation/schemas";
import { Login } from "../../application/auth/use-cases/Login";
import { AuthRepoSequelize } from "../db/AuthRepoSequelize";
import { errorMiddleware } from "../../shared/errors";
import { logger } from "../../utils/logger";

export const authRouter = Router();

// Use existing rate limiting configuration (preserving security hardening)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Critical endpoint protection
  message: { error: "RATE_LIMIT", message: "Too many auth attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize use cases with repository
const authRepo = new AuthRepoSequelize();
const loginUseCase = new Login(authRepo);

/**
 * POST /auth/login - User authentication
 * 
 * Thin controller that:
 * 1. Validates request (Zod schema)
 * 2. Applies rate limiting (security)
 * 3. Delegates to use case (business logic)
 * 4. Returns response (HTTP concerns)
 */
authRouter.post("/login", 
  authRateLimit,
  validate(loginSchema), 
  async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      logger.info('Login attempt', { 
        email: req.validated?.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const result = await loginUseCase.execute(req.validated);
      
      logger.info('Login successful', { 
        email: req.validated?.email,
        duration: Date.now() - startTime
      });

      res.status(200).json(result);
    } catch (error) {
      logger.warn('Login failed', { 
        email: req.validated?.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      });
      
      next(error);
    }
  }
);

// Apply existing error handling
authRouter.use(errorMiddleware);
