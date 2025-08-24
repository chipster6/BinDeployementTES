/**
 * ResponseHelper Type Definitions
 */

import { Response } from 'express';

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

export class ResponseHelper {
  static success<T = any>(res: Response, options: SuccessResponseOptions<T>): Response;
  static error(res: Response, options: ErrorResponseOptions): Response;
  static paginated<T = any>(res: Response, data: T[], pagination: any): Response;
  static noContent(res: Response): Response;
  static created<T = any>(res: Response, data: T, message?: string): Response;
  static badRequest(res: Response, message: string, errors?: any[]): Response;
  static unauthorized(res: Response, message?: string): Response;
  static forbidden(res: Response, message?: string): Response;
  static notFound(res: Response, message?: string): Response;
  static conflict(res: Response, message: string): Response;
  static internalError(res: Response, message?: string): Response;
}

declare module '@/utils/ResponseHelper' {
  export { ResponseHelper, ErrorResponseOptions, SuccessResponseOptions };
}
