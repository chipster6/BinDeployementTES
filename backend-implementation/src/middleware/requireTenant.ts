import { Request, Response, NextFunction } from "express";
import { err } from "../shared/ResponseHelper";

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  const hdr = req.header("X-Tenant-Id");
  // also allow JWT-derived value if present on request by upstream auth middleware
  const jwtTenant = (req as any)?.user?.tenant_id ?? (req as any)?.user?.tenantId;
  const tenant = hdr ?? jwtTenant;
  if (!tenant) {
    return err(res, { error: "BAD_REQUEST", message: "X-Tenant-Id header is required" }, 400);
  }
  (req as any).tenant_id = String(tenant);
  res.setHeader("X-Tenant-Id", String(tenant));
  return next();
}

export default requireTenant;