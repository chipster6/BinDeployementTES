import type { Response, Request } from 'express';
import type { ApiResponse, PaginatedData, PaginationMeta } from '@/types/api';

export interface ErrorResponseOptions {
  message: string;
  statusCode?: number;
  errors?: any[];
}

export interface SuccessResponseOptions<T = any> {
  data: T;
  message?: string;
  statusCode?: number;
  meta?: Record<string, any>;
}

function isRequest(x: any): x is Request {
  return x && typeof x === 'object' && 'method' in x && 'url' in x;
}

export class ResponseHelper {
  static success<T = any>(res: Response, options: SuccessResponseOptions<T>): Response {
    const { data, message = 'Success', statusCode = 200, meta } = options;
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta
    };
    return res.status(statusCode).json(response);
  }

  // Support both (res, details) and legacy (res, req, details) call patterns
  static error(res: Response, a: ErrorResponseOptions | Request, b?: ErrorResponseOptions | number): Response {
    let details: ErrorResponseOptions = { message: 'Error' };
    let status = 500;

    if (isRequest(a)) {
      // Legacy: (res, req, details)
      details = (b as ErrorResponseOptions) ?? details;
      status = details.statusCode ?? status;
    } else {
      // Modern: (res, details[, status])
      details = a;
      status = (typeof b === 'number' ? b : details.statusCode) ?? status;
    }

    const response: ApiResponse = {
      success: false,
      message: details.message,
      errors: details.errors ?? []
    };
    return res.status(status).json(response);
  }

  static paginated<T = any>(res: Response, data: T[], pagination: PaginationMeta): Response {
    const response: ApiResponse<PaginatedData<T>> = {
      success: true,
      data: {
        items: data,
        pagination
      }
    };
    return res.status(200).json(response);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static created<T = any>(res: Response, data: T, message: string = 'Created successfully'): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data
    };
    return res.status(201).json(response);
  }

  static badRequest(res: Response, message: string, errors: any[] = []): Response {
    const response: ApiResponse = {
      success: false,
      message,
      errors
    };
    return res.status(400).json(response);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    const response: ApiResponse = {
      success: false,
      message
    };
    return res.status(401).json(response);
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    const response: ApiResponse = {
      success: false,
      message
    };
    return res.status(403).json(response);
  }

  static notFound(res: Response, message: string = 'Not found'): Response {
    const response: ApiResponse = {
      success: false,
      message
    };
    return res.status(404).json(response);
  }

  static conflict(res: Response, message: string): Response {
    const response: ApiResponse = {
      success: false,
      message
    };
    return res.status(409).json(response);
  }

  static internalError(res: Response, message: string = 'Internal server error'): Response {
    const response: ApiResponse = {
      success: false,
      message
    };
    return res.status(500).json(response);
  }
}
