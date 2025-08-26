export type ErrorEnvelope = {
  error: string;
  message: string;
  meta?: Record<string, unknown>;
};

export const ok = <T>(res: any, body: T, status = 200) =>
  res.status(status).json(body);

export const err = (res: any, e: ErrorEnvelope, status = 400) =>
  res.status(status).json(e);

export const conflict = (res: any, meta: Record<string, unknown>) =>
  err(res, { error: "CONFLICT", message: "Conflict detected", meta }, 409);

export const unauthorized = (res: any, msg = "Unauthorized") =>
  err(res, { error: "UNAUTHORIZED", message: msg }, 401);

export const forbidden = (res: any, msg = "Forbidden") =>
  err(res, { error: "FORBIDDEN", message: msg }, 403);

export const precondition = (res: any, msg = "ETag mismatch") =>
  err(res, { error: "PRECONDITION_FAILED", message: msg }, 412);

export const tooLarge = (res: any, msg = "Payload too large") =>
  err(res, { error: "PAYLOAD_TOO_LARGE", message: msg }, 413);

export const rateLimited = (res: any, retryAfterSec = 60) =>
  res.set("Retry-After", String(retryAfterSec))
     .status(429)
     .json({ error: "RATE_LIMITED", message: "Too many requests" });