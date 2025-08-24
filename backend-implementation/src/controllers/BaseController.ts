import type { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '@/utils/ResponseHelper';
import { logger } from '@/utils/logger';

/**
 * Base controller class with common error handling
 */
export abstract class BaseController {
  /**
   * Handle errors in a consistent way
   */
  protected handleError(res: Response, error: unknown, message: string = 'An error occurred'): void {
    logger.error(message, { error });
    
    if (error instanceof Error) {
      ResponseHelper.error(res, { 
        message: error.message || message,
        statusCode: 500
      });
    } else {
      ResponseHelper.error(res, { 
        message,
        statusCode: 500
      });
    }
  }
  
  /**
   * Handle success responses
   */
  protected handleSuccess(res: Response, data: any, message: string = 'Success'): void {
    ResponseHelper.success(res, {
      data,
      message
    });
  }
}
