import type { Response, Request } from 'express';

export interface ErrorResponseOptions {
  message: string;
  statusCode?: number;
  errors?: any[];
}

export interface SuccessResponseOptions<T = any> {
  data: T;
  message?: string;
  statusCode?: number;
}

function isRequest(x: any): x is Request {
  return x && typeof x === 'object' && 'method' in x && 'url' in x;
}

export class ResponseHelper {
  static success<T = any>(res: Response, options: SuccessResponseOptions<T>): Response {
    const { data, message = 'Success', statusCode = 200 } = options;
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
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

    return res.status(status).json({
      success: false,
      message: details.message,
      errors: details.errors ?? []
    });
  }

  static paginated<T = any>(res: Response, data: T[], pagination: any): Response {
    return res.status(200).json({
      success: true,
      data,
      pagination
    });
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static created<T = any>(res: Response, data: T, message: string = 'Created successfully'): Response {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  static badRequest(res: Response, message: string, errors: any[] = []): Response {
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  }

  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return res.status(401).json({
      success: false,
      message
    });
  }

  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return res.status(403).json({
      success: false,
      message
    });
  }

  static notFound(res: Response, message: string = 'Not found'): Response {
    return res.status(404).json({
      success: false,
      message
    });
  }

  static conflict(res: Response, message: string): Response {
    return res.status(409).json({
      success: false,
      message
    });
  }

  static internalError(res: Response, message: string = 'Internal server error'): Response {
    return res.status(500).json({
      success: false,
      message
    });
  }
}
