import { Response } from "express";

export type ErrorEnvelope = {
  error: string;
  message: string;
  meta?: Record<string, unknown>;
};

export function ok<T>(res: Response, body: T, etag?: string, status = 200): void {
  if (etag) res.setHeader("ETag", etag);
  res.status(status).json(body);
}

export function err(res: Response, payload: ErrorEnvelope, status = 400): void {
  res.status(status).json(payload);
}

export function conflict(
  res: Response,
  message = "Conflict",
  meta?: Record<string, unknown>
): void {
  res.status(409).json({ error: "CONFLICT", message, meta });
}

export function precondition(res: Response, message = "Precondition failed"): void {
  res.status(412).json({ error: "PRECONDITION_FAILED", message });
}