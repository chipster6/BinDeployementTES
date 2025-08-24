/**
 * ============================================================================
 * VALIDATION HANDLER MIDDLEWARE
 * ============================================================================
 * 
 * Centralized validation result processing middleware.
 * Handles express-validator results and provides consistent error responses.
 * 
 * Features:
 * - Standardized validation error processing
 * - Consistent error response format
 * - Request validation status checking
 * - Error logging and tracking
 * 
 * Created by: Code Refactoring Analyst
 * Date: 2025-08-24
 */

import type { Request, Response, NextFunction } from "express";
import { validationResult, ValidationError as ExpressValidationError } from "express-validator";
import { ValidationError } from "@/middleware/errorHandler";
import { logger } from "@/utils/logger";

/**
 * Validation result processing middleware
 * Should be used after validation chains to check for errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array();
    
    logger.warn("Validation failed", {
      path: req.path,
      method: req.method,
      errors: validationErrors,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Transform validation errors to consistent format
    const formattedErrors = validationErrors.map((error: ExpressValidationError) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
      location: error.type === 'field' ? error.location : undefined,
    }));

    // Throw ValidationError which will be caught by error handler
    const validationError = new ValidationError(
      "Request validation failed",
      formattedErrors
    );

    next(validationError);
    return;
  }

  // No validation errors, continue to next middleware
  next();
};

/**
 * Combine validation chains with error handling
 * Convenience function to apply validation and error handling in one step
 */
export const validateAndHandle = (validationChains: any[]) => {
  return [...validationChains, handleValidationErrors];
};

export default handleValidationErrors;