import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Bin
export const createBinSchema = z.object({
  serialNumber: z.string().min(1, "Serial number is required"),
  type: z.enum(["ROLL_OFF", "FRONT_LOAD", "REAR_LOAD", "SIDE_LOAD", "COMPACTOR"]).default("ROLL_OFF"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  material: z.enum(["GENERAL", "RECYCLABLE", "ORGANIC", "HAZARDOUS", "CONSTRUCTION"]).default("GENERAL"),
  customerId: z.string().min(1, "Customer ID is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  organizationId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE", "SCHEDULED", "FULL", "DAMAGED", "REMOVED"]).optional()
});

// Express middleware helpers
export type Schema<T> = z.ZodType<T>;
export const validate =
  <T>(schema: Schema<T>) =>
  (req: any, res: any, next: any) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.issues });
    req.validated = parsed.data;
    next();
  };
