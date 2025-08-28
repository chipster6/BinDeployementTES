import { Request, Response, NextFunction } from "express";
import { err } from "../shared/ResponseHelper";

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export function requireIdempotencyKey(req: Request, res: Response, next: NextFunction) {
  // Apply to state-changing ops; keep it simple: enforce on POST under /ops/**
  if (req.method !== "POST" || !req.path.startsWith("/ops/")) return next();
  const key = req.header("Idempotency-Key");
  if (!key || !UUID_RE.test(key)) {
    return err(
      res,
      { error: "BAD_REQUEST", message: "Idempotency-Key header must be a UUID" },
      400
    );
  }
  (req as any).idempotencyKey = key;
  return next();
}

export default requireIdempotencyKey;