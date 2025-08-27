export class AppError extends Error { constructor(public code: string, message: string, public status = 400, public meta: any = {}) { super(message); } }
export class BadRequest extends AppError { constructor(msg="Bad request", meta?: any){ super("BAD_REQUEST", msg, 400, meta);} }
export class Forbidden extends AppError { constructor(msg="Forbidden", meta?: any){ super("FORBIDDEN", msg, 403, meta);} }
export class NotFound extends AppError { constructor(msg="Not found", meta?: any){ super("NOT_FOUND", msg, 404, meta);} }
export class DomainError extends AppError { constructor(msg="Domain error", meta?: any){ super("DOMAIN_ERROR", msg, 422, meta);} }

// Express error mapper
export const errorMiddleware = (err: any, _req: any, res: any, _next: any) => {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.code, message: err.message, meta: err.meta });
  return res.status(500).json({ error: "INTERNAL", message: "Unexpected error" });
};
