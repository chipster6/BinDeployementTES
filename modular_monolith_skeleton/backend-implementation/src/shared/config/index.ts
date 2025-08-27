import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ISSUER: z.string().default("bindeploy"),
  DATABASE_URL: z.string().url().optional(), // monolith default
  // add per-adapter URLs as needed
});

export const CONFIG = envSchema.parse(process.env);
